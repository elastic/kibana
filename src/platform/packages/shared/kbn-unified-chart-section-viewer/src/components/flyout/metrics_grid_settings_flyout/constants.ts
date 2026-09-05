/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_HISTOGRAM_PERCENTILES,
  METRICS_GRID_SIMPLE_AGGREGATIONS,
  type HistogramPercentile,
  type MetricsGridSettings,
} from '@kbn/discover-utils';

/** Settings owned by this flyout. */
export const FLYOUT_SETTING_KEYS = [
  'counterAggregation',
  'gaugeAggregation',
  'histogramPercentile',
] as const satisfies ReadonlyArray<keyof MetricsGridSettings>;

export const SIMPLE_AGGREGATION_OPTIONS = METRICS_GRID_SIMPLE_AGGREGATIONS;

export const HISTOGRAM_PERCENTILE_OPTIONS = METRICS_GRID_HISTOGRAM_PERCENTILES;

export const HISTOGRAM_PERCENTILE_VALUES: Record<HistogramPercentile, number> = {
  p50: 50,
  p75: 75,
  p90: 90,
  p95: 95,
  p99: 99,
};
