/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggParamType } from './param_types/agg';
import type { BaseParamType } from './param_types/base';
import type { AggConfig } from './agg_config';
import type { IAggConfigs } from './agg_configs';
export type AggParam = BaseParamType;
export interface AggParamOption {
  val: string;
  display: string;
  enabled?(agg: AggConfig): boolean;
}
export declare const initParams: <TAggParam extends AggParamType = AggParamType>(
  params: TAggParam[]
) => TAggParam[];
/**
 * Reads an aggConfigs
 *
 * @method write
 * @param  {AggConfig} aggConfig
 *         the AggConfig object who's type owns these aggParams and contains the param values for our param defs
 * @param  {object} [locals]
 *         an array of locals that will be available to the write function (can be used to enhance
 *         the quality of things like date_histogram's "auto" interval)
 * @return {object} output
 *         output of the write calls, reduced into a single object. A `params: {}` property is exposed on the
 *         output object which is used to create the agg dsl for the search request. All other properties
 *         are dependent on the AggParam#write methods which should be studied for each AggType.
 */
export declare const writeParams: <
  TAggConfig extends AggConfig = AggConfig,
  TAggParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>
>(
  params: Array<Partial<TAggParam>> | undefined,
  aggConfig: TAggConfig,
  aggs?: IAggConfigs,
  locals?: Record<string, any>
) => Record<string, any>;
