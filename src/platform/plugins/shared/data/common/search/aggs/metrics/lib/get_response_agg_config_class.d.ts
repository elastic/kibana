/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IMetricAggConfig } from '../metric_agg_type';
/**
 * Get the ResponseAggConfig class for an aggConfig,
 * which might be cached on the aggConfig or created.
 *
 * @param  {AggConfig} agg - the AggConfig the VAC should inherit from
 * @param  {object} props - properties that the VAC should have
 * @return {Constructor} - a constructor for VAC objects that will inherit the aggConfig
 */
export declare const getResponseAggConfigClass: (agg: any, props: Partial<IMetricAggConfig>) => any;
export interface IResponseAggConfig extends IMetricAggConfig {
  key: string | number;
  parentId: IMetricAggConfig['id'];
}
export declare function getResponseAggId(parentId: string, key: string): string;
export declare const create: (
  parentAgg: IMetricAggConfig,
  props: Partial<IMetricAggConfig>
) => {
  (this: IResponseAggConfig, key: string): void;
  prototype: any;
};
