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
import { IBucketAggConfig, BucketAggType, BucketAggParam } from './bucket_agg_type';
import { IAggConfig } from '../agg_config';

export const isType = (...types: string[]) => {
  return (agg: IAggConfig): boolean => {
    const field = agg.params.field;

    return types.some((type) => field && field.type === type);
  };
};

export const isNumberType = isType('number');
export const isStringType = isType('string');
export const isStringOrNumberType = isType('string', 'number');

export const migrateIncludeExcludeFormat = {
  serialize(this: BucketAggParam<IBucketAggConfig>, value: any, agg: IBucketAggConfig) {
    if (this.shouldShow && !this.shouldShow(agg)) return;
    if (!value || isString(value) || Array.isArray(value)) return value;
    else return value.pattern;
  },
  write(
    this: BucketAggType<IBucketAggConfig>,
    aggConfig: IBucketAggConfig,
    output: Record<string, any>
  ) {
    const value = aggConfig.getParam(this.name);

    if (Array.isArray(value) && value.length > 0 && isNumberType(aggConfig)) {
      const parsedValue = value.filter((val): val is number => Number.isFinite(val));
      if (parsedValue.length) {
        output.params[this.name] = parsedValue;
      }
    } else if (isObject(value)) {
      output.params[this.name] = (value as any).pattern;
    } else if (value && isStringType(aggConfig)) {
      output.params[this.name] = value;
    }
  },
} as Partial<BucketAggParam<IBucketAggConfig>>;
