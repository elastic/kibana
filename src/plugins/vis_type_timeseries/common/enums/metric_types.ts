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

export enum METRIC_AGGREGATIONS {
  PERCENTILE = 'percentile',
  PERCENTILE_RANK = 'percentile_rank',
  TOP_HIT = 'top_hit',
  COUNT = 'count',
  FILTER_RATIO = 'filter_ratio',
  POSITIVE_RATE = 'positive_rate',
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

export enum SIBLING_PIPELINE_AGGREGATIONS {
  AVG_BUCKET = 'avg_bucket',
  MAX_BUCKET = 'max_bucket',
  MIN_BUCKET = 'min_bucket',
  STD_DEVIATION_BUCKET = 'std_deviation_bucket',
  SUM_BUCKET = 'sum_bucket',
  SUM_OF_SQUARES_BUCKET = 'sum_of_squares_bucket',
  VARIANCE_BUCKET = 'variance_bucket',
}

export enum PARENT_PIPELINE_AGGREGATIONS {
  CALCULATION = 'clculation',
  CUMULATIVE_SUM = 'cumulative_sum',
  DERIVATIVE = 'derivative',
  MOVING_AVERAGE = 'moving_average',
  POSITIVE_ONLY = 'positive_only',
  SERIAL_DIFF = 'serial_diff',
}

// We should probably use BUCKET_TYPES from data plugin in future.
export enum BUCKET_TYPES {
  TERMS = 'terms',
  FILTERS = 'filters',
}

export const EXTENDED_STATS_TYPES = [
  METRIC_TYPES.STD_DEVIATION,
  METRIC_TYPES.VARIANCE,
  METRIC_TYPES.SUM_OF_SQUARES,
];
