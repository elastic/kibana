var _ = require('lodash');
var Writable = require('stream').Writable;
var util = require('util');

var levels = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

function JSONStream(options) {
  options = options || {};
  Writable.call(this, options);
}

util.inherits(JSONStream, Writable);

JSONStream.prototype._write = function (entry, encoding, callback) {
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

  process.stdout.write(JSON.stringify(output) + "\n");
  callback();
};

module.exports = JSONStream;
