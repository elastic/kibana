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

import { AggParamType } from './param_types/agg';
import { FieldParamType } from './param_types/field';
import { OptionedParamType } from './param_types/optioned';
import { StringParamType } from './param_types/string';
import { JsonParamType } from './param_types/json';
import { BaseParamType } from './param_types/base';

import { AggConfig } from './agg_config';
import { IAggConfigs } from './agg_configs';

const paramTypeMap = {
  field: FieldParamType,
  optioned: OptionedParamType,
  string: StringParamType,
  json: JsonParamType,
  agg: AggParamType,
  _default: BaseParamType,
} as Record<string, any>;

export type AggParam = BaseParamType;

export interface AggParamOption {
  val: string;
  display: string;
  enabled?(agg: AggConfig): boolean;
}

export const initParams = <TAggParam extends AggParamType = AggParamType>(
  params: TAggParam[]
): TAggParam[] =>
  params.map((config: TAggParam) => {
    const Class = paramTypeMap[config.type] || paramTypeMap._default;

    return new Class(config);
  }) as TAggParam[];

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
export const writeParams = <
  TAggConfig extends AggConfig = AggConfig,
  TAggParam extends AggParamType<TAggConfig> = AggParamType<TAggConfig>
>(
  params: Array<Partial<TAggParam>> = [],
  aggConfig: TAggConfig,
  aggs?: IAggConfigs,
  locals?: Record<string, any>
) => {
  const output: Record<string, any> = {
    params: {} as Record<string, any>,
  };
  locals = locals || {};

  params.forEach((param) => {
    if (param.write) {
      param.write(aggConfig, output, aggs, locals);
    } else {
      if (param && param.name) {
        output.params[param.name] = aggConfig.params[param.name];
      }
    }
  });

  return output;
};
