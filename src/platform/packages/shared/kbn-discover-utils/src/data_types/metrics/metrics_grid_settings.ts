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
 * Derived from `@kbn/esql-language`'s `FunctionNames` enum (rather than a
 * hand-rolled string union) so this type tracks the canonical ES|QL function
 * names. Using a template-literal type (instead of the enum members
 * themselves) keeps the resulting type a plain string literal union --
 * assignable from either `FunctionNames.AVG` or the literal `'avg'` -- since
 * TypeScript string enums are otherwise nominally typed.
 */
export type SimpleAggregation =
  | `${FunctionNames.AVG}`
  | `${FunctionNames.SUM}`
  | `${FunctionNames.MIN}`
  | `${FunctionNames.MAX}`;

export enum HistogramPercentileValue {
  P50 = 'p50',
  P75 = 'p75',
  P90 = 'p90',
  P95 = 'p95',
  P99 = 'p99',
}

/**
 * Which percentile bucket to use when the metric's aggregation is
 * `PERCENTILE(field, N)`. There is no per-percentile ES|QL function name to
 * derive this from (only `FunctionNames.PERCENTILE` itself, which names the
 * function, not the requested percentile), so these remain their own
 * literal union; the function name itself is sourced from `FunctionNames`
 * wherever it's used to build the aggregation expression.
 */
export type HistogramPercentile = `${HistogramPercentileValue}`;

export interface MetricsGridSettings extends SerializableRecord {
  counterAggregation: SimpleAggregation;
  gaugeAggregation: SimpleAggregation;
  histogramPercentile: HistogramPercentile;
  dimensions: string[];
  searchTerm: string;
}

export const METRICS_GRID_SETTINGS_DEFAULTS: MetricsGridSettings = {
  counterAggregation: FunctionNames.SUM,
  gaugeAggregation: FunctionNames.AVG,
  histogramPercentile: 'p95',
  dimensions: [],
  searchTerm: '',
};
