/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
export declare const DIVERSIFIED_SAMPLER_AGG_NAME = 'diversified_sampler';
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
export declare const getDiversifiedSamplerBucketAgg: () => BucketAggType<
  import('./bucket_agg_type').IBucketAggConfig
>;
