var ansicolors = require('ansicolors');
var eventToJson = require('./_event_to_json');
var GoodReporter = require('good-reporter');
var util = require('util');
var moment = require('moment');
var stringify = require('json-stringify-safe');
var querystring = require('querystring');
var numeral = require('numeral');

var colors = {
  log: 'blue',
  req: 'green',
  res: 'green',
  ops: 'cyan',
  err: 'red',
  info: 'blue',
  error: 'red',
  fatal: 'magenta'
};

function stripColors(string) {
  return string.replace(/\u001b[^m]+m/g, '');
}

var Console = module.exports = function (events, options) {
  this._json = options.json;
  GoodReporter.call(this, events);
};
util.inherits(Console, GoodReporter);

Console.prototype.stop = function () { };

Console.prototype._report = function (name, data) {
  data = eventToJson(name, data);
  var nameCrayon = ansicolors[colors[name.substr(0, 3)]];
  var typeCrayon = ansicolors[colors[data.level]];
  var output;
  if (this._json) {
    data.message = stripColors(data.message);
    output = stringify(data);
  } else {
    output = nameCrayon(name.substr(0, 3));
    output += ': ';
    output += typeCrayon(data.level.toUpperCase());
    output += ' ';
    output += '[ ';
    output += ansicolors.brightBlack(moment(data.timestamp).format());
    output += ' ] ';

    if (data.error) {
      output += ansicolors.red(data.error.stack);
    } else {
      output += data.message;
    }

  }
  console.log(output);
};
