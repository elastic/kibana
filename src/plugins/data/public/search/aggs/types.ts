/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { IndexPattern } from '../../index_patterns';
import {
  AggConfigSerialized,
  AggConfigs,
  AggParamsTerms,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  CreateAggConfigParams,
  getCalculateAutoTimeExpression,
} from './';

export { IAggConfig, AggConfigSerialized } from './agg_config';
export { CreateAggConfigParams, IAggConfigs } from './agg_configs';
export { IAggType } from './agg_type';
export { AggParam, AggParamOption } from './agg_params';
export { IFieldParamType } from './param_types';
export { IMetricAggType } from './metrics/metric_agg_type';
export { DateRangeKey } from './buckets/lib/date_range';
export { IpRangeKey } from './buckets/lib/ip_range';
export { OptionedValueProp } from './param_types/optioned';

/** @internal */
export interface SearchAggsSetup {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  types: AggTypesRegistrySetup;
}

/** @internal */
export interface SearchAggsStart {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  createAggConfigs: (
    indexPattern: IndexPattern,
    configStates?: CreateAggConfigParams[],
    schemas?: Record<string, any>
  ) => InstanceType<typeof AggConfigs>;
  types: AggTypesRegistryStart;
}

/** @internal */
export interface AggExpressionType {
  type: 'agg_type';
  value: AggConfigSerialized;
}

/** @internal */
export type AggExpressionFunctionArgs<
  Name extends keyof AggParamsMapping
> = AggParamsMapping[Name] & Pick<AggConfigSerialized, 'id' | 'enabled' | 'schema'>;

/**
 * A global list of the param interfaces for each agg type.
 * For now this is internal, but eventually we will probably
 * want to make it public.
 *
 * @internal
 */
export interface AggParamsMapping {
  terms: AggParamsTerms;
}
