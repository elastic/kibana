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
import { aggDiversifiedSamplerFnName } from './diversified_sampler_fn';

export const DIVERSIFIED_SAMPLER_AGG_NAME = 'diversified_sampler';

const title = i18n.translate('data.search.aggs.buckets.diversifiedSamplerTitle', {
  defaultMessage: 'Diversified sampler',
  description: 'Diversified sampler aggregation title',
});

export interface AggParamsDiversifiedSampler extends BaseAggParams {
  /**
   * Is used to provide values used for de-duplication
   */
  field: string;

  /**
   * Limits how many top-scoring documents are collected in the sample processed on each shard.
   */
  shard_size?: number;

  /**
   * Limits how many documents are permitted per choice of de-duplicating value
   */
  max_docs_per_value?: number;
}

/**
 * Like the sampler aggregation this is a filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 * The diversified_sampler aggregation adds the ability to limit the number of matches that share a common value.
 */
export const getDiversifiedSamplerBucketAgg = () =>
  new BucketAggType({
    name: DIVERSIFIED_SAMPLER_AGG_NAME,
    title,
    customLabels: false,
    expressionName: aggDiversifiedSamplerFnName,
    params: [
      {
        name: 'shard_size',
        type: 'number',
      },
      {
        name: 'max_docs_per_value',
        type: 'number',
      },
      {
        name: 'field',
        type: 'field',
      },
    ],
  });
