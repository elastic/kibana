'use strict';

let _ = require('lodash');
let ansicolors = require('ansicolors');

let log = _.restParam(function (color, label, rest1) {
  console.log.apply(console, [color(` ${_.trim(label)} `)].concat(rest1));
});

exports.green = _.partial(log, require('../color').green);
exports.red = _.partial(log, require('../color').red);
exports.yellow = _.partial(log, require('../color').yellow);
