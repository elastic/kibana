let _ = require('lodash');
let ansicolors = require('ansicolors');

let log = _.restParam(function (color, label, rest1) {
  console.log.apply(console, [color(` ${_.trim(label)} `)].concat(rest1));
});

let color = require('./color');

module.exports = class Log {
  constructor(quiet, silent) {
    this.good = quiet || silent ? _.noop : _.partial(log, color.green);
    this.warn = quiet || silent ? _.noop : _.partial(log, color.yellow);
    this.bad = silent ? _.noop : _.partial(log, color.red);
  }
};
