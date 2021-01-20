/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export enum METRIC_TYPES {
  AVG = 'avg',
  CARDINALITY = 'cardinality',
  AVG_BUCKET = 'avg_bucket',
  MAX_BUCKET = 'max_bucket',
  MIN_BUCKET = 'min_bucket',
  SUM_BUCKET = 'sum_bucket',
  COUNT = 'count',
  CUMULATIVE_SUM = 'cumulative_sum',
  DERIVATIVE = 'derivative',
  GEO_BOUNDS = 'geo_bounds',
  GEO_CENTROID = 'geo_centroid',
  MEDIAN = 'median',
  MIN = 'min',
  MAX = 'max',
  MOVING_FN = 'moving_avg',
  SERIAL_DIFF = 'serial_diff',
  SUM = 'sum',
  TOP_HITS = 'top_hits',
  PERCENTILES = 'percentiles',
  PERCENTILE_RANKS = 'percentile_ranks',
  STD_DEV = 'std_dev',
}
