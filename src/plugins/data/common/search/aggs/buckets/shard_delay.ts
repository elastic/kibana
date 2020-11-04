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

import { BucketAggType } from './bucket_agg_type';
import { BaseAggParams } from '../types';
import { aggShardDelayFnName } from './shard_delay_fn';

export const SHARD_DELAY_AGG_NAME = 'shard_delay';

export interface AggParamsShardDelay extends BaseAggParams {
  delay?: number;
}

export const getShardDelayBucketAgg = () =>
  new BucketAggType({
    name: SHARD_DELAY_AGG_NAME,
    title: 'Shard Delay',
    expressionName: aggShardDelayFnName,
    createFilter: () => ({ match_all: {} }),
    customLabels: false,
    params: [
      {
        name: 'delay',
        type: 'string',
        default: '5s',
        write(aggConfig, output) {
          output.params = {
            ...output.params,
            value: aggConfig.params.delay,
          };
        },
      },
    ],
  });
