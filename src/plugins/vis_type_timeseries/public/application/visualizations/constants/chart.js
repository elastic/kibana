/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const COLORS = {
  LINE_COLOR: 'rgba(105,112,125,0.2)',
  TEXT_COLOR: 'rgba(0,0,0,0.4)',
  TEXT_COLOR_REVERSED: 'rgba(255,255,255,0.5)',
  VALUE_COLOR: 'rgba(0,0,0,0.7)',
  VALUE_COLOR_REVERSED: 'rgba(255,255,255,0.8)',
};

export const GRID_LINE_CONFIG = {
  stroke: 'rgba(125,125,125,0.1)',
};

export const X_ACCESSOR_INDEX = 0;
export const STACK_ACCESSORS = [0];
export const Y_ACCESSOR_INDEXES = [1];
export const Y0_ACCESSOR_INDEXES = [2];

export const STACKED_OPTIONS = {
  NONE: 'none',
  PERCENT: 'percent',
  STACKED: 'stacked',
  STACKED_WITHIN_SERIES: 'stacked_within_series',
};
