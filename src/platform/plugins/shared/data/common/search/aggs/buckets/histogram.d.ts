/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExtendedBounds } from '../../expressions';
import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import type { IBucketAggConfig } from './bucket_agg_type';
import type { BucketAggType } from './bucket_agg_type';
export interface AutoBounds {
  min: number;
  max: number;
}
export interface HistogramBucketAggDependencies {
  getConfig: <T = any>(key: string) => T;
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}
export interface IBucketHistogramAggConfig extends IBucketAggConfig {
  setAutoBounds: (bounds: AutoBounds) => void;
  getAutoBounds: () => AutoBounds;
}
export interface AggParamsHistogram extends BaseAggParams {
  field: string;
  interval: number | string;
  used_interval?: number | string;
  maxBars?: number;
  intervalBase?: number;
  min_doc_count?: boolean;
  has_extended_bounds?: boolean;
  extended_bounds?: ExtendedBounds;
  autoExtendBounds?: boolean;
}
export declare const getHistogramBucketAgg: ({
  getConfig,
  getFieldFormatsStart,
}: HistogramBucketAggDependencies) => BucketAggType<IBucketHistogramAggConfig>;
