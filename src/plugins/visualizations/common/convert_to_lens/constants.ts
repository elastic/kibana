/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  MATH: 'math',
  OVERALL_SUM: 'overall_sum',
  OVERALL_MIN: 'overall_min',
  OVERALL_MAX: 'overall_max',
  OVERALL_AVERAGE: 'overall_average',
  STATIC_VALUE: 'static_value',
  NORMALIZE_BY_UNIT: 'normalize_by_unit',
} as const;

export const Operations = { ...OperationsWithSourceField, ...OperationsWithReferences } as const;
