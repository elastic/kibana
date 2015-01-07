var morgan = require('morgan');
var env = process.env.NODE_ENV || 'development';
var format = 'dev';

if (env !== 'development') {
  // Content lenght needs to be a number or null
  morgan.token('content-length', function (req, res) {
    var contentLength = (res._headers || {})['content-length'];
    return contentLength && parseInt(contentLength, 10) || 'null';
  });


  // Need to ensure the response time is a number or null
  var responseTime = morgan['response-time'];
  morgan['response-time'] = function (req, res) {
    var value = responseTime(req, res);
    if (value === '-') return 'null';
    return value;
  };

  // Log level
  morgan.token('level', function (req, res) {
    return (res.statusCode > 399) ? 'ERROR' : 'INFO';
  });

  var jsonFormat = '{ ';
  jsonFormat += '"@timestamp": ":date[iso]", ';
  jsonFormat += '"status": :status, ';
  jsonFormat += '"level": ":level", ';
  jsonFormat += '"name": "kibana", ';
  jsonFormat += '"request_method": ":method", ';
  jsonFormat += '"request": ":url", ';
  jsonFormat += '"remote_addr": ":remote-addr", ';
  jsonFormat += '"remote_user": ":remote-user", ';
  jsonFormat += '"http_version": ":http-version", ';
  jsonFormat += '"content_length": :content-length, ';
  jsonFormat += '"response_time": :response-time ';
  jsonFormat += ' }';
  morgan.format('json', jsonFormat);

  format = 'json';
}

module.exports = function () {
  return morgan(format);
};
