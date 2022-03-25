/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export enum METRIC_TYPES {
  AVG = 'avg',
  FILTERED_METRIC = 'filtered_metric',
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
  SINGLE_PERCENTILE = 'single_percentile',
  MIN = 'min',
  MAX = 'max',
  MOVING_FN = 'moving_avg',
  SERIAL_DIFF = 'serial_diff',
  SUM = 'sum',
  TOP_HITS = 'top_hits',
  TOP_METRICS = 'top_metrics',
  PERCENTILES = 'percentiles',
  PERCENTILE_RANKS = 'percentile_ranks',
  STD_DEV = 'std_dev',
}
