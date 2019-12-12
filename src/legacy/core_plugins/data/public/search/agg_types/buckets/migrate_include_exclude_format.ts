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

import { isString, isObject } from 'lodash';
import { IBucketAggConfig, BucketAggType, BucketAggParam } from './_bucket_agg_type';
import { AggConfig } from '../agg_config';

export const isType = (type: string) => {
  return (agg: AggConfig): boolean => {
    const field = agg.params.field;

    return field && field.type === type;
  };
};

export const isStringType = isType('string');

export const migrateIncludeExcludeFormat = {
  serialize(this: BucketAggParam<IBucketAggConfig>, value: any, agg: IBucketAggConfig) {
    if (this.shouldShow && !this.shouldShow(agg)) return;
    if (!value || isString(value)) return value;
    else return value.pattern;
  },
  write(
    this: BucketAggType<IBucketAggConfig>,
    aggConfig: IBucketAggConfig,
    output: Record<string, any>
  ) {
    const value = aggConfig.getParam(this.name);

    if (isObject(value)) {
      output.params[this.name] = value.pattern;
    } else if (value && isStringType(aggConfig)) {
      output.params[this.name] = value;
    }
  },
} as Partial<BucketAggParam<IBucketAggConfig>>;
