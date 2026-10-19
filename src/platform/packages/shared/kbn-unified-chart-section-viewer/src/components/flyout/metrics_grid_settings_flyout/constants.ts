/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  METRICS_GRID_HISTOGRAM_VISUALIZATIONS,
  METRICS_GRID_SIMPLE_AGGREGATIONS,
  type HistogramVisualization,
  type MetricsGridSettings,
} from '@kbn/discover-utils';

/** Settings owned by this flyout. */
export const FLYOUT_SETTING_KEYS = [
  'counterAggregation',
  'gaugeAggregation',
  'histogramPercentile',
] as const satisfies ReadonlyArray<keyof MetricsGridSettings>;

export const SIMPLE_AGGREGATION_OPTIONS = METRICS_GRID_SIMPLE_AGGREGATIONS;

export const HISTOGRAM_VISUALIZATION_OPTIONS = METRICS_GRID_HISTOGRAM_VISUALIZATIONS;

/** Numeric percentiles. `distribution` is a heatmap and has no percentile value. */
export type NumericHistogramPercentile = Exclude<HistogramVisualization, 'distribution'>;

export const HISTOGRAM_PERCENTILE_VALUES: Record<NumericHistogramPercentile, number> = {
  p50: 50,
  p75: 75,
  p90: 90,
  p95: 95,
  p99: 99,
};

/** Series percentile drawn when a heatmap cannot be shown. */
export const HISTOGRAM_SERIES_FALLBACK = 'p95' as const;

/** Maps a heatmap selection to the percentile the series chart draws. */
export const toSeriesPercentile = (value: HistogramVisualization): NumericHistogramPercentile =>
  value === 'distribution' ? HISTOGRAM_SERIES_FALLBACK : value;

/** True when the stored visualization is a heatmap rather than a percentile series. */
export const isDistributionVisualization = (
  value: HistogramVisualization
): value is 'distribution' => value === 'distribution';
