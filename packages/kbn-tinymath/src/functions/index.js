/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const { abs } = require('./abs');
const { add } = require('./add');
const { cbrt } = require('./cbrt');
const { ceil } = require('./ceil');
const { clamp } = require('./clamp');
const { cos } = require('./cos');
const { count } = require('./count');
const { cube } = require('./cube');
const { degtorad } = require('./degtorad');
const { divide } = require('./divide');
const { exp } = require('./exp');
const { first } = require('./first');
const { fix } = require('./fix');
const { floor } = require('./floor');
const { last } = require('./last');
const { log } = require('./log');
const { log10 } = require('./log10');
const { max } = require('./max');
const { mean } = require('./mean');
const { median } = require('./median');
const { min } = require('./min');
const { mod } = require('./mod');
const { mode } = require('./mode');
const { multiply } = require('./multiply');
const { pi } = require('./pi');
const { pow } = require('./pow');
const { radtodeg } = require('./radtodeg');
const { random } = require('./random');
const { range } = require('./range');
const { round } = require('./round');
const { sin } = require('./sin');
const { size } = require('./size');
const { sqrt } = require('./sqrt');
const { square } = require('./square');
const { subtract } = require('./subtract');
const { sum } = require('./sum');
const { tan } = require('./tan');
const { unique } = require('./unique');

module.exports = {
  functions: {
    abs,
    add,
    cbrt,
    ceil,
    clamp,
    cos,
    count,
    cube,
    degtorad,
    divide,
    exp,
    first,
    fix,
    floor,
    last,
    log,
    log10,
    max,
    mean,
    median,
    min,
    mod,
    mode,
    multiply,
    pi,
    pow,
    radtodeg,
    random,
    range,
    round,
    sin,
    size,
    sqrt,
    square,
    subtract,
    sum,
    tan,
    unique,
  },
};
