/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggTypesDependencies } from '../agg_types';
import type { BaseAggParams } from '../types';
import type { MetricAggType } from './metric_agg_type';
import type { IResponseAggConfig } from './lib/get_response_agg_config_class';
export interface AggParamsPercentileRanks extends BaseAggParams {
  field: string;
  values?: number[];
}
export type IPercentileRanksAggConfig = IResponseAggConfig;
export interface PercentileRanksMetricAggDependencies {
  getFieldFormatsStart: AggTypesDependencies['getFieldFormatsStart'];
}
export declare const getPercentileRanksMetricAgg: ({
  getFieldFormatsStart,
}: PercentileRanksMetricAggDependencies) => MetricAggType<IResponseAggConfig>;
