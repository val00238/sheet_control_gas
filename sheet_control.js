var BOOK = null;
function loadBook() {
  if (BOOK == null) {
    var bookId = "YOUR_BOOK_ID";
    var book = SpreadsheetApp.openById(bookId);
    BOOK = book;
  }
  
  return BOOK;
}

var SHEET = null;
function loadSheet() {
  if (SHEET == null)  {
    var sheetName = "YOUR_SHEET_NAME";
    var book = loadBook();
    var sheet = book.getSheetByName(sheetName);
    SHEET = sheet;
  }

  return SHEET;
}

function isType(type, obj) {
  var clas = Object.prototype.toString.call(obj).slice(8, -1);

  return obj !== undefined && obj !== null && clas === type;
}

function doGet(e) {
  var book = loadBook();
  var sheet = loadSheet();

  t = HtmlService.createTemplateFromFile('index.html');
  t.title = book.getName();
  t.bookURL = book.getUrl();

  return t.evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}

function toLocaleString(date) {
  var date_string = [
    date.getFullYear(),
    ("0"+(date.getMonth()+1)).slice(-2),
    ("0"+date.getDate()).slice(-2)
  ].join( '/' );
  
  var time_string = [
    ("0"+(date.getHours())).slice(-2),
    ("0"+(date.getMinutes())).slice(-2),
    ("0"+(date.getSeconds())).slice(-2)
  ].join( ':' );

  return date_string;
}

var ADMIN_MAIL = "YOUR_ADMIN_MAIL";
function filterData(data) {
  var user_mail = Session.getActiveUser().getEmail();
  var admin_mail = ADMIN_MAIL;

  var result = [];
  for (var index in data) {
    var line = data[index];
 
    var own = false;
     if (user_mail == admin_mail) {
       own = true;
     }
    
    var item_array = [];
    for (var i in line) {
      var item = line[i];
      if (isType("Date", item)) {
        item = toLocaleString(item);
      }
      if (!own) {
        if (user_mail == item) {
          own = true;
        }
      }
      item_array.push(item);
    }
    
    if (own) {
      result.push(item_array);
    }
  }

  return result;
}

function getHeaders() {
  var sheet = loadSheet();
  
  // get first line(title)
  var colStartIndex = 1;
  var rowNum = 1;
  var firstRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  var firstRowValues = firstRange.getValues();
  var titleColumns = firstRowValues[0];
  
  return titleColumns;
}

function getData() {
  var sheet = loadSheet();
  
   // after the second line(data)
  var lastRow = sheet.getLastRow();
  var rowValues = [];
  for(var rowIndex=2; rowIndex<=lastRow; rowIndex++) {
    var colStartIndex = 1;
    var rowNum = 1;
    var range = sheet.getRange(rowIndex, colStartIndex, rowNum, sheet.getLastColumn());
    var values = range.getValues();
    
    rowValues.push(values[0]);
  }
 
  return filterData(rowValues);
}

function updateForm() {
  var url = ScriptApp.getService().getUrl();
  
  updateOwnData();
  
  return url;
}

function updateOwnData() {
  var sheet = loadSheet();
  var user_mail = Session.getActiveUser().getEmail();
  
   // after the second line(data)
  var lastRow = sheet.getLastRow();
  for(var rowIndex=2; rowIndex<=lastRow; rowIndex++) {
    var colStartIndex = 1;
    var rowNum = 1;
    var range = sheet.getRange(rowIndex, colStartIndex, rowNum, sheet.getLastColumn());
    var values = range.getValues();
    
    var date_cell;
    var update = false;
    for(var i=range.getColumn(); i<=range.getLastColumn(); i++){
      var cell = range.getCell(1, i);
      var value = cell.getValue();
      
      if (value == user_mail) {
        update = true;
      }
      if (isType("Date", value)) {
        date_cell = cell;
      }
    }
    
    if (update) {
      date_cell.setValue(new Date());
    }
  }  
}

function checkDate() {
  var sheet = loadSheet();
  var user_mail = Session.getActiveUser().getEmail();
    
  var nowMonth = new Date().getMonth();
  var mail_list = [];
  
  // after the second line(data)
  var lastRow = sheet.getLastRow();
  for(var rowIndex=2; rowIndex<=lastRow; rowIndex++) {
    var colStartIndex = 1;
    var rowNum = 1;
    var range = sheet.getRange(rowIndex, colStartIndex, rowNum, sheet.getLastColumn());
    var values = range.getValues();
    
    var date_value;
    var mail;
    for(var i=range.getColumn(); i<=range.getLastColumn(); i++){
      var cell = range.getCell(1, i);
      var value = cell.getValue();
      
      if (isType("String", value)) {
        if (value.indexOf("@") > 0) {
          mail = value;
        }
      }
      if (isType("Date", value)) {
        date_value = value;
      }
    }
    if (value.getMonth() != nowMonth) {
      mail_list.push(mail);
    }
  }
 
  // send mail
  var send_list = mail_list.filter(function (x, i, self) {
            return self.indexOf(x) === i;
          });
  
  for (var i in send_list) {
    var adder = send_list[i];
    var book = loadBook();
    var url = ScriptApp.getService().getUrl();

    MailApp.sendEmail(adder,
                 "[" + book.getName() + "]シートを確認してください",
                 "更新されていない情報があります。シート確認してください。\n\n スプレッドシート：" + book.getUrl() + "\n\n Webフォーム：" + url);
  }
}

function convertSheet2JsonText(sheet) {
  // first line(title)
  var colStartIndex = 1;
  var rowNum = 1;
  var firstRange = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  var firstRowValues = firstRange.getValues();
  var titleColumns = firstRowValues[0];
  
  // after the second line(data)
  var lastRow = sheet.getLastRow();
  var rowValues = [];
  for(var rowIndex=2; rowIndex<=lastRow; rowIndex++) {
    var colStartIndex = 1;
    var rowNum = 1;
    var range = sheet.getRange(rowIndex, colStartIndex, rowNum, sheet.getLastColumn());
    var values = range.getValues();
    
    rowValues.push(values[0]);
  }
 
  // create json
  var jsonArray = [];
  for(var i=0; i<rowValues.length; i++) {
    var line = rowValues[i];
    var json = new Object();
    for(var j=0; j<titleColumns.length; j++) {
      json[titleColumns[j]] = line[j];
    }
    jsonArray.push(json);
  }
  return jsonArray;
}
