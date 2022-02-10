/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import { IAggConfig } from '../agg_config';
import { FilterFieldFn, GenericBucket, IAggConfigs } from '../../../../common';
import { AggType, AggTypeConfig } from '../agg_type';
import { AggParamType } from '../param_types/agg';
import type { FieldTypes } from '../param_types/field';

export interface IBucketAggConfig extends IAggConfig {
  type: InstanceType<typeof BucketAggType>;
}

export interface BucketAggParam<TBucketAggConfig extends IAggConfig>
  extends AggParamType<TBucketAggConfig> {
  scriptable?: boolean;
  filterFieldTypes?: FieldTypes;
  onlyAggregatable?: boolean;

  /**
   * Filter available fields by passing filter fn on a {@link DataViewField}
   * If used, takes precedence over filterFieldTypes and other filter params
   */
  filterField?: FilterFieldFn;
}

const bucketType = 'buckets';

interface BucketAggTypeConfig<TBucketAggConfig extends IAggConfig>
  extends AggTypeConfig<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
  getKey?: (bucket: any, key: any, agg: IAggConfig) => any;
  getShiftedKey?: (
    agg: TBucketAggConfig,
    key: string | number,
    timeShift: moment.Duration
  ) => string | number;
  orderBuckets?(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number;
  splitForTimeShift?(agg: TBucketAggConfig, aggs: IAggConfigs): boolean;
  getTimeShiftInterval?(agg: TBucketAggConfig): undefined | moment.Duration;
}

export class BucketAggType<TBucketAggConfig extends IAggConfig = IBucketAggConfig> extends AggType<
  TBucketAggConfig,
  BucketAggParam<TBucketAggConfig>
> {
  getKey: (bucket: any, key: any, agg: TBucketAggConfig) => any;
  type = bucketType;

  getShiftedKey(
    agg: TBucketAggConfig,
    key: string | number,
    timeShift: moment.Duration
  ): string | number {
    return key;
  }

  getTimeShiftInterval(agg: TBucketAggConfig): undefined | moment.Duration {
    return undefined;
  }

  orderBuckets(agg: TBucketAggConfig, a: GenericBucket, b: GenericBucket): number {
    return Number(a.key) - Number(b.key);
  }

  constructor(config: BucketAggTypeConfig<TBucketAggConfig>) {
    super(config);

    this.getKey =
      config.getKey ||
      ((bucket, key) => {
        return key || bucket.key;
      });

    if (config.getShiftedKey) {
      this.getShiftedKey = config.getShiftedKey;
    }

    if (config.orderBuckets) {
      this.orderBuckets = config.orderBuckets;
    }

    if (config.getTimeShiftInterval) {
      this.getTimeShiftInterval = config.getTimeShiftInterval;
    }

    if (config.splitForTimeShift) {
      this.splitForTimeShift = config.splitForTimeShift;
    }
  }
}

export function isBucketAggType(aggConfig: any): aggConfig is BucketAggType {
  return aggConfig && aggConfig.type === bucketType;
}
