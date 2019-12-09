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

import { AggConfigs } from '../agg_configs';
import { AggConfig } from '../../vis';
import { SearchSourceContract, FetchOptions } from '../../courier/types';

export class BaseParamType<TAggConfig extends AggConfig = AggConfig> {
  name: string;
  type: string;
  displayName: string;
  required: boolean;
  advanced: boolean;
  editorComponent: any = null;
  default: any;
  write: (
    aggConfig: TAggConfig,
    output: Record<string, any>,
    aggConfigs?: AggConfigs,
    locals?: Record<string, any>
  ) => void;
  serialize: (value: any, aggConfig?: TAggConfig) => any;
  deserialize: (value: any, aggConfig?: TAggConfig) => any;
  options: any[];
  valueType?: any;

  onChange?(agg: TAggConfig): void;
  shouldShow?(agg: TAggConfig): boolean;

  /**
   *  A function that will be called before an aggConfig is serialized and sent to ES.
   *  Allows aggConfig to retrieve values needed for serialization
   *  Example usage: an aggregation needs to know the min/max of a field to determine an appropriate interval
   *
   *  @param {AggConfig} aggConfig
   *  @param {Courier.SearchSource} searchSource
   *  @returns {Promise<undefined>|undefined}
   */
  modifyAggConfigOnSearchRequestStart: (
    aggConfig: TAggConfig,
    searchSource?: SearchSourceContract,
    options?: FetchOptions
  ) => void;

  constructor(config: Record<string, any>) {
    this.name = config.name;
    this.type = config.type;
    this.displayName = config.displayName || this.name;
    this.required = config.required === true;
    this.advanced = config.advanced || false;
    this.onChange = config.onChange;
    this.shouldShow = config.shouldShow;
    this.default = config.default;
    this.editorComponent = config.editorComponent;

    const defaultWrite = (aggConfig: TAggConfig, output: Record<string, any>) => {
      if (aggConfig.params[this.name]) {
        output.params[this.name] = aggConfig.params[this.name] || this.default;
      }
    };

    this.write = config.write || defaultWrite;
    this.serialize = config.serialize;
    this.deserialize = config.deserialize;
    this.options = config.options;
    this.modifyAggConfigOnSearchRequestStart =
      config.modifyAggConfigOnSearchRequestStart || function() {};
    this.valueType = config.valueType || config.type;
  }
}
