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
import { aggRandomSamplerFnName } from './random_sampler_fn';

export const RANDOM_SAMPLER_AGG_NAME = 'random_sampler';

const title = i18n.translate('data.search.aggs.buckets.randomSamplerTitle', {
  defaultMessage: 'Random Sampler',
  description: 'Random sampler aggregation title',
});

export interface AggParamsRandomSampler extends BaseAggParams {
  /**
   * The sampling probability
   */
  probability: number;
  /**
   * The seed to generate the random sampling of documents. (optional)
   */
  seed?: number;
}

/**
 * A filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 */
export const getRandomSamplerBucketAgg = () =>
  new BucketAggType({
    name: RANDOM_SAMPLER_AGG_NAME,
    title,
    customLabels: false,
    expressionName: aggRandomSamplerFnName,
    params: [
      {
        name: 'probability',
        type: 'number',
      },
      {
        name: 'seed',
        type: 'number',
      },
    ],
  });
