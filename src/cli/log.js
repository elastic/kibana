import _ from 'lodash';

const log = _.restParam(function (color, label, rest1) {
  console.log.apply(console, [color(` ${_.trim(label)} `)].concat(rest1));
});

import { green, yellow, red } from './color';

export default class Log {
  constructor(quiet, silent) {
    this.good = quiet || silent ? _.noop : _.partial(log, green);
    this.warn = quiet || silent ? _.noop : _.partial(log, yellow);
    this.bad = silent ? _.noop : _.partial(log, red);
  }
}
