/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { IAggConfig } from '../agg_config';
import { KBN_FIELD_TYPES } from '../../../../common';
import { AggType, AggTypeConfig } from '../agg_type';
import { AggParamType } from '../param_types/agg';

export interface IBucketAggConfig extends IAggConfig {
  type: InstanceType<typeof BucketAggType>;
}

export interface BucketAggParam<TBucketAggConfig extends IAggConfig>
  extends AggParamType<TBucketAggConfig> {
  scriptable?: boolean;
  filterFieldTypes?: KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
}

const bucketType = 'buckets';

interface BucketAggTypeConfig<TBucketAggConfig extends IAggConfig>
  extends AggTypeConfig<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
  getKey?: (bucket: any, key: any, agg: IAggConfig) => any;
}

export class BucketAggType<TBucketAggConfig extends IAggConfig = IBucketAggConfig> extends AggType<
  TBucketAggConfig,
  BucketAggParam<TBucketAggConfig>
> {
  getKey: (bucket: any, key: any, agg: TBucketAggConfig) => any;
  type = bucketType;

  constructor(config: BucketAggTypeConfig<TBucketAggConfig>) {
    super(config);

    this.getKey =
      config.getKey ||
      ((bucket, key) => {
        return key || bucket.key;
      });
  }
}

export function isBucketAggType(aggConfig: any): aggConfig is BucketAggType {
  return aggConfig && aggConfig.type === bucketType;
}
