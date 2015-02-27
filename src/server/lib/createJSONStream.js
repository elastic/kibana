var _ = require('lodash');
var through = require('through');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function write(entry) {
  entry = JSON.parse(entry.toString('utf8'));
  var env = process.env.NODE_ENV || 'development';

  var output = {
    '@timestamp': entry.time,
    'level': levels[entry.level],
    'message': entry.msg,
    'node_env': env,
    'request': entry.req,
    'response': entry.res
  };

  if (entry.err) {
    output.error = entry.err;
    if (!output.message) output.message = output.error.message;
  }

  this.queue(JSON.stringify(output) + '\n');
}

function end() {
  this.queue(null);
}

module.exports = function () {
  return through(write, end);
};