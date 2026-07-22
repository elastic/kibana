/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export type SimpleAggregation = 'avg' | 'sum' | 'min' | 'max';

export type HistogramPercentile = 'p50' | 'p75' | 'p90' | 'p95' | 'p99';

export interface MetricsGridSettings extends SerializableRecord {
  counterAggregation: SimpleAggregation;
  gaugeAggregation: SimpleAggregation;
  histogramPercentile: HistogramPercentile;
}

export const METRICS_GRID_SETTINGS_DEFAULTS: MetricsGridSettings = {
  counterAggregation: 'sum',
  gaugeAggregation: 'avg',
  histogramPercentile: 'p95',
};
