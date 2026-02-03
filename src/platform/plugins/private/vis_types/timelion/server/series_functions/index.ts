/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// Top-level series functions
import abs from './abs';
import bars from './bars';
import color from './color';
import condition from './condition';
import cusum from './cusum';
import derivative from './derivative';
import divide from './divide';
import first from './first';
import fit from './fit';
import hide from './hide';
import label from './label';
import legend from './legend';
import lines from './lines';
import log from './log';
import max from './max';
import min from './min';
import movingaverage from './movingaverage';
import movingstd from './movingstd';
import multiply from './multiply';
import points from './points';
import precision from './precision';
import props from './props';
import range from './range';
import scale_interval from './scale_interval';
import staticFn from './static';
import subtract from './subtract';
import sum from './sum';
import title from './title';
import trim from './trim';
import worldbank from './worldbank';
import worldbank_indicators from './worldbank_indicators';
import yaxis from './yaxis';

// Subdirectory functions (index.js)
import aggregate from './aggregate';
import es from './es';
import holt from './holt';
import trend from './trend';

export const seriesFunctions = {
  abs,
  bars,
  color,
  condition,
  cusum,
  derivative,
  divide,
  first,
  fit,
  hide,
  label,
  legend,
  lines,
  log,
  max,
  min,
  movingaverage,
  movingstd,
  multiply,
  points,
  precision,
  props,
  range,
  scale_interval,
  static: staticFn,
  subtract,
  sum,
  title,
  trim,
  worldbank,
  worldbank_indicators,
  yaxis,
  // Subdirectory functions
  aggregate,
  es,
  holt,
  trend,
};
