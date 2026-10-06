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
export declare const SAMPLER_AGG_NAME = 'sampler';
export interface AggParamsSampler extends BaseAggParams {
  /**
   * Limits how many top-scoring documents are collected in the sample processed on each shard.
   */
  shard_size?: number;
}
/**
 * A filtering aggregation used to limit any sub aggregations' processing to a sample of the top-scoring documents.
 */
export declare const getSamplerBucketAgg: () => BucketAggType<
  import('./bucket_agg_type').IBucketAggConfig
>;
