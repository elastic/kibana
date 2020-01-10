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

import { AggConfig } from '../../vis';
import { KBN_FIELD_TYPES } from '../../../../../plugins/data/public';
import { AggType, AggTypeConfig } from '../agg_type';
import { AggParamType } from '../param_types/agg';

export interface IBucketAggConfig extends AggConfig {
  type: InstanceType<typeof BucketAggType>;
}

export interface BucketAggParam<TBucketAggConfig extends AggConfig>
  extends AggParamType<TBucketAggConfig> {
  scriptable?: boolean;
  filterFieldTypes?: KBN_FIELD_TYPES | KBN_FIELD_TYPES[] | '*';
}

const bucketType = 'buckets';

interface BucketAggTypeConfig<TBucketAggConfig extends AggConfig>
  extends AggTypeConfig<TBucketAggConfig, BucketAggParam<TBucketAggConfig>> {
  getKey?: (bucket: any, key: any, agg: AggConfig) => any;
}

export class BucketAggType<TBucketAggConfig extends AggConfig = IBucketAggConfig> extends AggType<
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
