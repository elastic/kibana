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
  info: 'green',
  error: 'red',
  warning: 'red',
  fatal: 'magenta',
  status: 'yellow',
  debug: 'brightBlack',
  server: 'brightBlack',
  optmzr: 'white',
  optimize: 'magenta',
  listening: 'magenta'
};

let color = _.memoize(function (name) {
  return ansicolors[typeColors[name]] || _.identity;
});

let type = _.memoize(function (t) {
  return color(t)(_.pad(t, 7).slice(0, 7));
});

let workerType = process.env.kbnWorkerType ? `${type(process.env.kbnWorkerType)} ` : '';

module.exports = class KbnLoggerJsonFormat extends LogFormat {
  format(data) {
    let time = color('time')(moment(data.timestamp).format('HH:mm:ss.SSS'));
    let msg = data.error ? color('error')(data.error.stack) : color('message')(data.message);

    let tags = _(data.tags)
    .sortBy(function (tag) {
      return color(tag) === _.identity ? `1${tag}` : `0${tag}`;
    })
    .reduce(function (s, t) {
      return s + `[${ color(t)(t) }]`;
    }, '');

    return `${workerType}${type(data.type)} [${time}] ${tags} ${msg}`;
  }
};
