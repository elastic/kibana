/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BucketAggType } from './bucket_agg_type';
import type { AggConfigSerialized, BaseAggParams, IAggConfig } from '../types';
interface CommonAggParamsMultiTerms extends BaseAggParams {
  fields: string[];
  orderBy: string;
  order?: 'asc' | 'desc';
  size?: number;
  shardSize?: number;
  otherBucket?: boolean;
  otherBucketLabel?: string;
  separatorLabel?: string;
}
export interface AggParamsMultiTermsSerialized extends CommonAggParamsMultiTerms {
  orderAgg?: AggConfigSerialized;
}
export interface AggParamsMultiTerms extends CommonAggParamsMultiTerms {
  orderAgg?: IAggConfig;
}
export declare const getMultiTermsBucketAgg: () => BucketAggType<
  import('./bucket_agg_type').IBucketAggConfig
>;
export {};
