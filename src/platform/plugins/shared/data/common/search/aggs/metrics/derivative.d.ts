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
export interface CommonAggParamsDerivative extends BaseAggParams {
  buckets_path?: string;
  metricAgg?: string;
}
export interface AggParamsDerivativeSerialized extends CommonAggParamsDerivative {
  customMetric?: AggConfigSerialized;
}
export interface AggParamsDerivative extends CommonAggParamsDerivative {
  customMetric?: IAggConfig;
}
export declare const getDerivativeMetricAgg: () => MetricAggType<
  import('./metric_agg_type').IMetricAggConfig
>;
