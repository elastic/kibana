/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { BucketAggType } from './bucket_agg_type';
import { BaseAggParams } from '../types';
import { aggSamplerFnName } from './sampler_fn';

export const SAMPLER_AGG_NAME = 'sampler';

const title = i18n.translate('data.search.aggs.buckets.samplerTitle', {
  defaultMessage: 'Sampler',
  description: 'Sampler aggregation title',
});

export interface AggParamsSampler extends BaseAggParams {
  /**
   * Limits how many top-scoring documents are collected in the sample processed on each shard.
   */
  shard_size?: number;
}

/**
 * A filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 */
export const getSamplerBucketAgg = () =>
  new BucketAggType({
    name: SAMPLER_AGG_NAME,
    title,
    customLabels: false,
    expressionName: aggSamplerFnName,
    params: [
      {
        name: 'shard_size',
        type: 'number',
      },
    ],
  });
