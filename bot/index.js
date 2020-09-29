const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

// replace the value below with the Telegram token you receive from @BotFather
const token = '1162738528:AAHQhQG744hL4QXqFrGIdI0VIuXKxfOxuBs';
var bot = new TelegramBot(token, { polling: true });
var questions = JSON.parse(fs.readFileSync('./questions.json'));

function getRandomQuestion() {
  return questions[Math.floor(Math.random() * questions.length)];
}

function newQuestion(msg) {
  var arr = getRandomQuestion();
  var text = arr.title;
  var options = {
    reply_markup: JSON.stringify({
      inline_keyboard: arr.buttons,
      parse_mode: 'Markdown'
    })
  };
  chat_id = msg.hasOwnProperty('chat') ? msg.chat.id : msg.from.id;
  bot.sendMessage(chat_id, text, options);
}

function check_progress(chat_id) {
  var progress_data = JSON.parse(fs.readFileSync('./progress.json'));
  var progress = {
    level: 1,
    count_right: 0
  }
  progress_data.forEach(element => {
    if (Number(element["user_id"]) == chat_id) {
      progress.level = element["progress_level"];
      progress.count_right = element["count_right"];
    }
  });
  return progress;
}

function check_user(chat_id) {
  let progress_data = JSON.parse(fs.readFileSync('./progress.json'));
  var count = 0;
  progress_data.forEach(element => {
    if (Number(element["user_id"]) == chat_id) {
      count++;
    }
  });
  if (count == 0) {
    var new_user = {
      "user_id": chat_id,
      "progress_level": 1,
      "count_right": 0
    }
    progress_data.push(new_user);
    fs.writeFile("./progress.json", JSON.stringify(progress_data), function (error) {
      if (error) throw error; // если возникла ошибка
      console.log("Асинхронная запись файла завершена.");
    });
  }
}

function sortByProgress(arr){
  arr.sort((a,b) => a.count_right < b.count_right ? 1 : -1)
}

bot.onText(/\/add_question (.+)/, (msg, [source, match]) => {
  var chat_id = msg.hasOwnProperty('chat') ? msg.chat.id : msg.from.id;
  console.log(msg);
  var quest_arr = match.split('/');
  var progress = check_progress(chat_id);
  if (progress.level >= 3) {
    let questions = JSON.parse(fs.readFileSync('./questions.json'));
    var max_id = questions.length;
    var new_question = {
      "id": max_id,
      "title": quest_arr[0],
      "buttons": [
        [
          {
            "text": "Да",
            "callback_data": max_id + "_1"
          }
        ],
        [
          {
            "text": "Нет",
            "callback_data": max_id + "_2"
          }
        ]
      ],
      "right_answer": Number(quest_arr[1]),
      "correct_text": "Верно!",
      "wrong_text": "Не совершайте такую ошибку!"
    }
    questions.push(new_question);
    fs.writeFile("./questions.json", JSON.stringify(questions), function (error) {
      if (error) throw error; // если возникла ошибка
      console.log("Асинхронная запись файла завершена.");
    });
    bot.sendMessage(chat_id, 'Вопрос добавлен!');
  }
  else {
    bot.sendMessage(chat_id, 'Повышай уровень для доступа к этой функции!');
  }
});

bot.on('message', msg => {
  const chat_id = msg.hasOwnProperty('chat') ? msg.chat.id : msg.from.id;
  switch (msg.text) {
    case "/start":
      check_user(chat_id);
      newQuestion(msg);
      break;
    case "/rating":
      var rating = JSON.parse(fs.readFileSync('./progress.json'));
      var all_rating = rating.length;
      sortByProgress(rating);
      var my_raiting = rating.length;
      for(var i = 0; i < all_rating; i++){
        if(Number(rating[i].user_id) == chat_id){
           my_raiting = i+1;
        }
      }
      bot.sendMessage(chat_id, 'Рейтинг: '+my_raiting + ' из '+ all_rating);
      break;
    case "/progress":
      var progress = check_progress(chat_id);
      bot.sendMessage(chat_id, progress.level + ' уровень');
      bot.sendMessage(chat_id, 'Кол-во верных ответов: ' + progress.count_right);
      break;
    default:

  }
});

bot.on('callback_query', function (msg) {
  if (Number(msg.data) == 1) {
    newQuestion(msg);
  }
  else {
    if (Number(msg.data) == 0) {
      bot.sendMessage(msg.from.id, 'Спасибо за участие!');
    }
    else {
      var answer = msg.data.split('_');
      var index = answer[0];
      var button = answer[1];

      if (questions[index].right_answer == button) {
        bot.sendMessage(msg.from.id, 'Ответ верный ✅');
        let progress_data = JSON.parse(fs.readFileSync('./progress.json'));
        progress_data.forEach(element => {
          if (Number(element["user_id"]) == chat_id) {
            element["count_right"] = Number(element["count_right"]) + 1
            if (Number(element["count_right"]) >= 3) {
              element["progress_level"] = 2
            }
            if (Number(element["count_right"]) >= 5) {
              element["progress_level"] = 3;
            }
          }
        });
        fs.writeFile("./progress.json", JSON.stringify(progress_data), function (error) {
          if (error) throw error; // если возникла ошибка
          console.log("Асинхронная запись файла завершена.");
        });
        bot.answerCallbackQuery(msg.id, questions[index].correct_text, true);

      } else {
        bot.sendMessage(msg.from.id, 'Ответ неверный ❌');
        bot.answerCallbackQuery(msg.id, questions[index].wrong_text, true);
      }

      var btn_opt = {
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [
              {
                "text": "Да",
                "callback_data": "1"
              }
            ],
            [
              {
                "text": "Нет",
                "callback_data": "0"
              }
            ]
          ],
          parse_mode: 'Markdown'
        })
      };
      bot.sendMessage(msg.from.id, 'Продолжить?', btn_opt);
    }
  }
});