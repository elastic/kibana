/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggTypeConfig } from '../agg_type';
import { AggType } from '../agg_type';
import type { AggParamType } from '../param_types/agg';
import type { AggConfig } from '../agg_config';
import type { FieldTypes } from '../param_types';
export interface IMetricAggConfig extends AggConfig {
  type: InstanceType<typeof MetricAggType>;
}
export interface MetricAggParam<TMetricAggConfig extends AggConfig>
  extends AggParamType<TMetricAggConfig> {
  filterFieldTypes?: FieldTypes;
  onlyAggregatable?: boolean;
  scriptable?: boolean;
}
interface MetricAggTypeConfig<TMetricAggConfig extends AggConfig>
  extends AggTypeConfig<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
  isScalable?: () => boolean;
  subtype?: string;
  enableEmptyAsNull?: boolean;
}
export type IMetricAggType = MetricAggType;
export declare class MetricAggType<
  TMetricAggConfig extends AggConfig = IMetricAggConfig
> extends AggType<TMetricAggConfig, MetricAggParam<TMetricAggConfig>> {
  subtype: string;
  isScalable: () => boolean;
  type: string;
  getKey: () => void;
  constructor(config: MetricAggTypeConfig<TMetricAggConfig>);
}
export declare function isMetricAggType(aggConfig: any): aggConfig is MetricAggType;
export {};
