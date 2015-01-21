var bunyan = require('bunyan');
var ansicolors = require('ansicolors');
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

var colors = {
  10: 'blue',
  20: 'green',
  30: 'cyan',
  40: 'yellow',
  50: 'red',
  60: 'magenta'
};

var levelColor = function (code) {
  if (code < 299) {
    return ansicolors.green(code);
  }
  if (code < 399) {
    return ansicolors.yellow(code)
  };
  if (code < 499) {
    return ansicolors.magenta(code)
  };
  return ansicolors.red(code);
};

function StdOutStream(options) {
  Writable.call(this, options);
}

util.inherits(StdOutStream, Writable);

StdOutStream.prototype._write = function (entry, encoding, callback) {
  entry = JSON.parse(entry.toString('utf8'));

  var crayon = ansicolors[colors[entry.level]];
  var output = crayon(levels[entry.level].toUpperCase());
  output += ' ';
  output += ansicolors.brightBlack(entry.time);
  output += ' ';

  if (entry.req && entry.res) {
    output += util.format('%s %s ', entry.req.method, entry.req.url);
    output += levelColor(entry.res.statusCode);
    output += ansicolors.brightBlack(util.format(' %dms - %d', entry.res.responseTime, entry.res.contentLength));
  } else if (entry.msg) {
    output += entry.msg;
  }
  process.stdout.write(output + "\n");
  if (entry.err) {
    process.stdout.write(ansicolors.brightRed(entry.err.stack) + "\n");
  }
  callback();
};

module.exports = StdOutStream;
