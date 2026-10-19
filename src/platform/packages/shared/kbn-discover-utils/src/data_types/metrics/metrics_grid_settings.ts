/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { FunctionNames } from '@kbn/esql-language';
import type { SerializableRecord } from '@kbn/utility-types';

/**
 * Aggregations supported by the metrics grid.
 * Values come from ES|QL's FunctionNames enum and are converted to plain string literals.
 */
export const METRICS_GRID_SIMPLE_AGGREGATIONS = [
  `${FunctionNames.AVG}`,
  `${FunctionNames.SUM}`,
  `${FunctionNames.MIN}`,
  `${FunctionNames.MAX}`,
] as const;

export type SimpleAggregation = (typeof METRICS_GRID_SIMPLE_AGGREGATIONS)[number];

export enum HistogramVisualizationValue {
  Distribution = 'distribution',
  P50 = 'p50',
  P75 = 'p75',
  P90 = 'p90',
  P95 = 'p95',
  P99 = 'p99',
}

export const METRICS_GRID_HISTOGRAM_VISUALIZATIONS = [
  `${HistogramVisualizationValue.Distribution}`,
  `${HistogramVisualizationValue.P50}`,
  `${HistogramVisualizationValue.P75}`,
  `${HistogramVisualizationValue.P90}`,
  `${HistogramVisualizationValue.P95}`,
  `${HistogramVisualizationValue.P99}`,
] as const;

/**
 * Histogram display for the metrics grid. `distribution` draws a heatmap.
 * The percentile values select `PERCENTILE(field, N)`. There is no
 * per-percentile ES|QL function name to derive those from (only
 * `FunctionNames.PERCENTILE` itself, which names the function, not the
 * requested percentile), so these remain their own literal union; the
 * function name itself is sourced from `FunctionNames` wherever it's used
 * to build the aggregation expression.
 */
export type HistogramVisualization = (typeof METRICS_GRID_HISTOGRAM_VISUALIZATIONS)[number];

export interface MetricsGridSettings extends SerializableRecord {
  counterAggregation: SimpleAggregation;
  gaugeAggregation: SimpleAggregation;
  histogramPercentile: HistogramVisualization;
  dimensions: string[];
  searchTerm: string;
}

export const METRICS_GRID_SETTINGS_DEFAULTS: MetricsGridSettings = {
  counterAggregation: FunctionNames.SUM,
  gaugeAggregation: FunctionNames.AVG,
  // Heatmaps stay opt-in until observability.metricsHeatmapsEnabled is on by default.
  histogramPercentile: 'p95',
  dimensions: [],
  searchTerm: '',
};
