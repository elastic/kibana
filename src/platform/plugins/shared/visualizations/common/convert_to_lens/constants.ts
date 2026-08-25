/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const OperationsWithSourceField = {
  FILTERS: 'filters',
  RANGE: 'range',
  TERMS: 'terms',
  DATE_HISTOGRAM: 'date_histogram',
  MIN: 'min',
  MAX: 'max',
  AVERAGE: 'average',
  SUM: 'sum',
  MEDIAN: 'median',
  STANDARD_DEVIATION: 'standard_deviation',
  UNIQUE_COUNT: 'unique_count',
  PERCENTILE: 'percentile',
  PERCENTILE_RANK: 'percentile_rank',
  COUNT: 'count',
  LAST_VALUE: 'last_value',
} as const;

export const OperationsWithReferences = {
  CUMULATIVE_SUM: 'cumulative_sum',
  COUNTER_RATE: 'counter_rate',
  DIFFERENCES: 'differences',
  MOVING_AVERAGE: 'moving_average',
  FORMULA: 'formula',
  STATIC_VALUE: 'static_value',
  NORMALIZE_BY_UNIT: 'normalize_by_unit',
} as const;

export const Operations = { ...OperationsWithSourceField, ...OperationsWithReferences } as const;
