import _ from 'lodash';
import ansicolors from 'ansicolors';
import moment from 'moment';

import LogFormat from './log_format';

const statuses = [
  'err',
  'info',
  'error',
  'warning',
  'fatal',
  'status',
  'debug'
];

const typeColors = {
  log: 'blue',
  req: 'green',
  res: 'green',
  ops: 'cyan',
  config: 'cyan',
  err: 'red',
  info: 'green',
  error: 'red',
  warning: 'red',
  fatal: 'magenta',
  status: 'yellow',
  debug: 'brightBlack',
  server: 'brightBlack',
  optmzr: 'white',
  managr: 'green',
  optimize: 'magenta',
  listening: 'magenta'
};

const color = _.memoize(function (name) {
  return ansicolors[typeColors[name]] || _.identity;
});

const type = _.memoize(function (t) {
  return color(t)(_.pad(t, 7).slice(0, 7));
});

const workerType = process.env.kbnWorkerType ? `${type(process.env.kbnWorkerType)} ` : '';

module.exports = class KbnLoggerJsonFormat extends LogFormat {
  format(data) {
    const time = color('time')(moment(data.timestamp).utc().format('HH:mm:ss.SSS'));
    const msg = data.error ? color('error')(data.error.stack) : color('message')(data.message);

    const tags = _(data.tags)
    .sortBy(function (tag) {
      if (color(tag) === _.identity) return `2${tag}`;
      if (_.includes(statuses, tag)) return `0${tag}`;
      return `1${tag}`;
    })
    .reduce(function (s, t) {
      return s + `[${ color(t)(t) }]`;
    }, '');

    return `${workerType}${type(data.type)} [${time}] ${tags} ${msg}`;
  }
};
