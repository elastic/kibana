/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
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
    } else if (Array.isArray(value) && value.length > 0 && isStringType(aggConfig)) {
      // check if is regex
      const filtered = value.filter((val) => val !== '');
      if (filtered.length) {
        const isRegularExpression = aggConfig.getParam(`${this.name}IsRegex`);
        output.params[this.name] = isRegularExpression ? filtered[0] : filtered;
      }
    } else if (isObject(value)) {
      output.params[this.name] = (value as any).pattern;
    } else if (value && isStringType(aggConfig)) {
      output.params[this.name] = value;
    }
  },
} as Partial<BucketAggParam<IBucketAggConfig>>;
