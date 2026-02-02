/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { abs } from './abs';
import { add } from './add';
import { cbrt } from './cbrt';
import { ceil } from './ceil';
import { clamp } from './clamp';
import { cos } from './cos';
import { count } from './count';
import { cube } from './cube';
import { defaults } from './defaults';
import { degtorad } from './degtorad';
import { divide } from './divide';
import { exp } from './exp';
import { first } from './first';
import { fix } from './fix';
import { floor } from './floor';
import { last } from './last';
import { log } from './log';
import { log10 } from './log10';
import { max } from './max';
import { mean } from './mean';
import { median } from './median';
import { min } from './min';
import { mod } from './mod';
import { mode } from './mode';
import { multiply } from './multiply';
import { pi } from './pi';
import { pow } from './pow';
import { radtodeg } from './radtodeg';
import { random } from './random';
import { range } from './range';
import { round } from './round';
import { sin } from './sin';
import { size } from './size';
import { sqrt } from './sqrt';
import { square } from './square';
import { subtract } from './subtract';
import { sum } from './sum';
import { tan } from './tan';
import { unique } from './unique';
import { eq, lt, gt, lte, gte, ifelse } from './comparison';

export const functions = {
  abs,
  add,
  cbrt,
  ceil,
  clamp,
  cos,
  count,
  cube,
  degtorad,
  defaults,
  divide,
  exp,
  first,
  fix,
  floor,
  ifelse,
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
  eq,
  lt,
  gt,
  lte,
  gte,
};
