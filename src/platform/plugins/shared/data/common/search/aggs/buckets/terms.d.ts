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
export { termsAggFilter } from './_terms_order_helper';
export interface CommonAggParamsTerms extends BaseAggParams {
  field: string;
  orderBy: string;
  size?: number;
  shardSize?: number;
  missingBucket?: boolean;
  missingBucketLabel?: string;
  otherBucket?: boolean;
  otherBucketLabel?: string;
  exclude?: string[] | string | number[];
  include?: string[] | string | number[];
  includeIsRegex?: boolean;
  excludeIsRegex?: boolean;
}
export interface AggParamsTermsSerialized extends CommonAggParamsTerms {
  orderAgg?: AggConfigSerialized;
  order?: 'asc' | 'desc';
}
export interface AggParamsTerms extends CommonAggParamsTerms {
  orderAgg?: IAggConfig;
  order?: {
    value: 'asc' | 'desc';
    text: string;
  };
}
export declare const getTermsBucketAgg: () => BucketAggType<
  import('./bucket_agg_type').IBucketAggConfig
>;
