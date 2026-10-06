/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewFieldBase, TimeRange } from '@kbn/es-query';
import type { AggTypesDependencies, TimeRangeBounds } from '../../..';
import type { ExtendedBounds } from '../../expressions';
import type { IBucketAggConfig } from './bucket_agg_type';
import type { BucketAggType } from './bucket_agg_type';
import type { TimeBuckets } from './lib/time_buckets';
import type { BaseAggParams } from '../types';
/** @internal */
export type CalculateBoundsFn = (timeRange: TimeRange) => TimeRangeBounds;
export interface IBucketDateHistogramAggConfig extends IBucketAggConfig {
  buckets: TimeBuckets;
}
export declare function isDateHistogramBucketAggConfig(
  agg: any
): agg is IBucketDateHistogramAggConfig;
export interface AggParamsDateHistogram extends BaseAggParams {
  field?: DataViewFieldBase | string;
  timeRange?: TimeRange;
  useNormalizedEsInterval?: boolean;
  scaleMetricValues?: boolean;
  interval?: string;
  used_interval?: string;
  time_zone?: string;
  used_time_zone?: string;
  drop_partials?: boolean;
  format?: string;
  min_doc_count?: number;
  extended_bounds?: ExtendedBounds;
  extendToTimeRange?: boolean;
}
export declare const getDateHistogramBucketAgg: ({
  calculateBounds,
  aggExecutionContext,
  getConfig,
}: AggTypesDependencies) => BucketAggType<IBucketDateHistogramAggConfig>;
