/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const CategoryDisplay = {
  DEFAULT: 'default',
  INSIDE: 'inside',
  HIDE: 'hide',
} as const;

export const NumberDisplay = {
  HIDDEN: 'hidden',
  PERCENT: 'percent',
  VALUE: 'value',
} as const;

export const LegendDisplay = {
  DEFAULT: 'default',
  SHOW: 'show',
  HIDE: 'hide',
} as const;

export const layerTypes = {
  DATA: 'data',
  REFERENCELINE: 'referenceLine',
  ANNOTATIONS: 'annotations',
  METRIC_TRENDLINE: 'metricTrendline',
} as const;
