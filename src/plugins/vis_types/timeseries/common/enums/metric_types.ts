/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// We should probably use METRIC_TYPES from data plugin in future.
export enum TSVB_METRIC_TYPES {
  FILTER_RATIO = 'filter_ratio',
  POSITIVE_RATE = 'positive_rate',
  PERCENTILE = 'percentile',
  PERCENTILE_RANK = 'percentile_rank',
  STATIC = 'static',
  STD_DEVIATION = 'std_deviation',
  SUM_OF_SQUARES = 'sum_of_squares',
  TOP_HIT = 'top_hit',
  VARIANCE = 'variance',
  CALCULATION = 'calculation',
  MOVING_AVERAGE = 'moving_average',
  POSITIVE_ONLY = 'positive_only',
  STD_DEVIATION_BUCKET = 'std_deviation_bucket',
  SUM_OF_SQUARES_BUCKET = 'sum_of_squares_bucket',
  VARIANCE_BUCKET = 'variance_bucket',
  SERIES_AGG = 'series_agg',
  MATH = 'math',
}

// We should probably use BUCKET_TYPES from data plugin in future.
export enum BUCKET_TYPES {
  TERMS = 'terms',
  FILTERS = 'filters',
}

export enum BASIC_AGGS_TYPES {
  COUNT = 'count',
  AVG = 'avg',
  MIN = 'min',
  MAX = 'max',
  SUM = 'sum',
  STD_DEV = 'std_deviation',
  SUM_OF_SQUARES = 'sum_of_squares',
  VARIANCE = 'variance',
  CARDINALITY = 'cardinality',
  VALUE_COUNT = 'value_count',
}
