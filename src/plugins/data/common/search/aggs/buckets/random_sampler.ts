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
import { aggRandomSamplerFnName } from './random_sampler_fn';

export const RANDOM_SAMPLER_AGG_NAME = 'random_sampler';

const title = i18n.translate('data.search.aggs.buckets.samplerTitle', {
  defaultMessage: 'Random sampler',
  description: 'Random sampler aggregation title',
});

export interface AggParamsRandomSampler extends BaseAggParams {
  probability?: number;
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
        name: 'aggs',
        type: 'schema',
      },
    ],
  });
