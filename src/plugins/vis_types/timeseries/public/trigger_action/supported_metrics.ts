/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

interface AggOptions {
  name: string;
  isFullReference: boolean;
}

// list of supported TSVB aggregation types in Lens
// some of them are supported on the quick functions tab and some of them
// are supported with formulas

export const SUPPORTED_METRICS: { [key: string]: AggOptions } = {
  avg: {
    name: 'average',
    isFullReference: false,
  },
  cardinality: {
    name: 'unique_count',
    isFullReference: false,
  },
  count: {
    name: 'count',
    isFullReference: false,
  },
  positive_rate: {
    name: 'counter_rate',
    isFullReference: true,
  },
  moving_average: {
    name: 'moving_average',
    isFullReference: true,
  },
  derivative: {
    name: 'differences',
    isFullReference: true,
  },
  cumulative_sum: {
    name: 'cumulative_sum',
    isFullReference: true,
  },
  avg_bucket: {
    name: 'overall_average',
    isFullReference: true,
  },
  max_bucket: {
    name: 'overall_max',
    isFullReference: true,
  },
  min_bucket: {
    name: 'overall_min',
    isFullReference: true,
  },
  sum_bucket: {
    name: 'overall_sum',
    isFullReference: true,
  },
  max: {
    name: 'max',
    isFullReference: false,
  },
  min: {
    name: 'min',
    isFullReference: false,
  },
  percentile: {
    name: 'percentile',
    isFullReference: false,
  },
  sum: {
    name: 'sum',
    isFullReference: false,
  },
  filter_ratio: {
    name: 'filter_ratio',
    isFullReference: false,
  },
  top_hit: {
    name: 'last_value',
    isFullReference: false,
  },
  math: {
    name: 'formula',
    isFullReference: true,
  },
  positive_only: {
    name: 'clamp',
    isFullReference: true,
  },
  static: {
    name: 'static_value',
    isFullReference: true,
  },
};
