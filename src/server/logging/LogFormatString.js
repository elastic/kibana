'use strict';

let _ = require('lodash');
let ansicolors = require('ansicolors');
let moment = require('moment');

let LogFormat = require('./LogFormat');

let typeColors = {
  log: 'blue',
  req: 'green',
  res: 'green',
  ops: 'cyan',
  err: 'red',
  info: 'blue',
  error: 'red',
  fatal: 'magenta'
};

let color = _.memoize(function (name) {
  return ansicolors[typeColors[name]] || _.identity;
});

module.exports = class KbnLoggerJsonFormat extends LogFormat {
  format(data) {
    let type = color(data.type)(_.padLeft(data.type, 6));
    let time = color('time')(moment(data.timestamp).format());
    let msg = data.error ? color('error')(data.error.stack) : color('message')(data.message);

    let tags = data.tags.reduce(function (s, t) {
      return s + `[${ color(t)(t) }]`;
    }, '');

    return `${type}: [ ${time} ] ${tags} ${msg}`;
  }
};
