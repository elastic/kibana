/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BucketAggType } from './bucket_agg_type';
import { BaseAggParams } from '../types';
import { aggShardDelayFnName } from './shard_delay_fn';

export const SHARD_DELAY_AGG_NAME = 'shard_delay';

export interface AggParamsShardDelay extends BaseAggParams {
  delay?: string;
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
