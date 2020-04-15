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
  AggType,
  AggTypesRegistrySetup,
  AggTypesRegistryStart,
  AggConfig,
  AggConfigs,
  CreateAggConfigParams,
  FieldParamType,
  getCalculateAutoTimeExpression,
  MetricAggType,
  aggTypeFieldFilters,
  parentPipelineAggHelper,
  siblingPipelineAggHelper,
} from './';

export { IAggConfig } from './agg_config';
export { CreateAggConfigParams, IAggConfigs } from './agg_configs';
export { IAggType } from './agg_type';
export { AggParam, AggParamOption } from './agg_params';
export { IFieldParamType } from './param_types';
export { IMetricAggType } from './metrics/metric_agg_type';
export { DateRangeKey } from './buckets/lib/date_range';
export { IpRangeKey } from './buckets/lib/ip_range';
export { OptionedValueProp, OptionedParamEditorProps } from './param_types/optioned';

/** @internal */
export interface SearchAggsSetup {
  calculateAutoTimeExpression: ReturnType<typeof getCalculateAutoTimeExpression>;
  types: AggTypesRegistrySetup;
}

/** @internal */
export interface SearchAggsStartLegacy {
  AggConfig: typeof AggConfig;
  AggType: typeof AggType;
  aggTypeFieldFilters: typeof aggTypeFieldFilters;
  FieldParamType: typeof FieldParamType;
  MetricAggType: typeof MetricAggType;
  parentPipelineAggHelper: typeof parentPipelineAggHelper;
  siblingPipelineAggHelper: typeof siblingPipelineAggHelper;
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
