var _ = require('lodash');
var morgan = require('morgan');
var env = process.env.NODE_ENV || 'development';
var bunyan = require('bunyan');
var StdOutStream = require('./StdOutStream');
var JSONStream = require('./JSONStream');
var stream = { stream: new JSONStream() };

if (env === 'development') {
  stream.stream = new StdOutStream();
}

var logger = module.exports = bunyan.createLogger({
  name: 'Kibana',
  streams: [ stream ],
  serializers: _.assign(bunyan.stdSerializers, {
    res: function (res) {
      if (!res) return res;
      return {
        statusCode: res.statusCode,
        responseTime: res.responseTime,
        contentLength: res.contentLength
      };
    }
  })
});

