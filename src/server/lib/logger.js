var _ = require('lodash');
var env = process.env.NODE_ENV || 'development';
var bunyan = require('bunyan');
var fs = require('fs');
var StdOutStream = require('./StdOutStream');
var createJSONStream = require('./createJSONStream');
var config = require('../config');
var streams = [];

// Set the default stream based on the enviroment. If we are on development then
// then we are going to create a pretty stream. Everytyhing else will get the
// JSON stream to stdout.
var defaultStream;
if (env === 'development') {
  defaultStream = new StdOutStream();
} else {
  defaultStream = createJSONStream()
    .pipe(process.stdout);
}

// If we are not being oppressed and we are not sending the output to a log file
// push the default stream to the list of streams
if (!config.quiet && !config.log_file) {
  streams.push({ stream: defaultStream });
}

// Send the stream to a file using the json format.
if (config.log_file) {
  var fileStream = fs.createWriteStream(config.log_file);
  streams.push({ stream: createJSONStream().pipe(fileStream) });
}

var logger = module.exports = bunyan.createLogger({
  name: 'Kibana',
  streams: streams,
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

