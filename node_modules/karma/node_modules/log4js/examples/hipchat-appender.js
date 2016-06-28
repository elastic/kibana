//Note that hipchat appender needs hipchat-client to work.
//If you haven't got hipchat-client installed, you'll get cryptic
//"cannot find module" errors when using the hipchat appender
var log4js = require('../lib/log4js');

log4js.configure({
  "appenders": [
    {
      "type" : "hipchat",
      "api_key": 'Hipchat_API_V1_Key',
      "room_id": "Room_ID",
      "from": "Tester",
      "format": "text",
      "notify": "NOTIFY",
      "category" : "hipchat"
    }
  ]
});

var logger = log4js.getLogger("hipchat");
logger.warn("Test Warn message");//yello
logger.info("Test Info message");//green
logger.debug("Test Debug Message");//hipchat client has limited color scheme
logger.trace("Test Trace Message");//so debug and trace are the same color: purple
logger.fatal("Test Fatal Message");//hipchat client has limited color scheme
logger.error("Test Error Message");// fatal and error are same color: red
logger.all("Test All message");//grey
//logger.debug("Test log message");