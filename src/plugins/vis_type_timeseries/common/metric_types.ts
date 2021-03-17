/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// We should probably use METRIC_TYPES from data plugin in future.
export enum METRIC_TYPES {
  PERCENTILE = 'percentile',
  PERCENTILE_RANK = 'percentile_rank',
  TOP_HIT = 'top_hit',
  COUNT = 'count',
  DERIVATIVE = 'derivative',
  STD_DEVIATION = 'std_deviation',
  VARIANCE = 'variance',
  SUM_OF_SQUARES = 'sum_of_squares',
  CARDINALITY = 'cardinality',
  VALUE_COUNT = 'value_count',
  AVERAGE = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
}

// We should probably use BUCKET_TYPES from data plugin in future.
export enum BUCKET_TYPES {
  TERMS = 'terms',
}

export const EXTENDED_STATS_TYPES = [
  METRIC_TYPES.STD_DEVIATION,
  METRIC_TYPES.VARIANCE,
  METRIC_TYPES.SUM_OF_SQUARES,
];
