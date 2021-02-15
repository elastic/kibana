/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const CurveType = {
  CURVE_CARDINAL: 0,
  CURVE_NATURAL: 1,
  CURVE_MONOTONE_X: 2,
  CURVE_MONOTONE_Y: 3,
  CURVE_BASIS: 4,
  CURVE_CATMULL_ROM: 5,
  CURVE_STEP: 6,
  CURVE_STEP_AFTER: 7,
  CURVE_STEP_BEFORE: 8,
  LINEAR: 9,
};

export const ScaleType = {
  Linear: 'linear',
  Ordinal: 'ordinal',
  Log: 'log',
  Sqrt: 'sqrt',
  Time: 'time',
};

export const BarSeries = () => null;
export const AreaSeries = () => null;

export { LIGHT_THEME, DARK_THEME } from '@elastic/charts';
