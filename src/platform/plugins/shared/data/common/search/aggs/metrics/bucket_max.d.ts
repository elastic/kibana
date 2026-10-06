/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricAggType } from './metric_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
export interface AggParamsBucketMaxSerialized extends BaseAggParams {
  customMetric?: AggConfigSerialized;
  customBucket?: AggConfigSerialized;
}
export interface AggParamsBucketMax extends BaseAggParams {
  customMetric?: IAggConfig;
  customBucket?: IAggConfig;
}
export declare const getBucketMaxMetricAgg: () => MetricAggType<
  import('./metric_agg_type').IMetricAggConfig
>;
