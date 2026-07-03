/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  HistogramPercentile,
  MetricsAggregationSettings,
  SimpleAggregation,
} from '../../types';

/**
 * Reproduces today's hardcoded aggregation behavior exactly:
 * counter -> SUM(RATE(...)), gauge -> AVG(...), histogram -> PERCENTILE(..., 95).
 */
export const METRICS_AGGREGATION_SETTINGS_DEFAULTS: MetricsAggregationSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};

export const SIMPLE_AGGREGATION_OPTIONS: SimpleAggregation[] = ['avg', 'sum', 'min', 'max'];

export const HISTOGRAM_PERCENTILE_OPTIONS: HistogramPercentile[] = [
  'p50',
  'p75',
  'p90',
  'p95',
  'p99',
];

export const HISTOGRAM_PERCENTILE_VALUES: Record<HistogramPercentile, number> = {
  p50: 50,
  p75: 75,
  p90: 90,
  p95: 95,
  p99: 99,
};
