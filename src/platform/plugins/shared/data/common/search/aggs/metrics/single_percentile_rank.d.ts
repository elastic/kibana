/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
import type { BaseAggParams } from '../types';
export interface AggParamsSinglePercentileRank extends BaseAggParams {
  field: string;
  value: number;
}
export declare const getSinglePercentileRankMetricAgg: () => MetricAggType<IResponseAggConfig>;
