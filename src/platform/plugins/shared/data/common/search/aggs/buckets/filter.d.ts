/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GeoBoundingBox, QueryFilter } from '../../expressions';
import type { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
import type { CalculateBoundsFn } from '.';
export interface AggParamsFilter extends BaseAggParams {
  geo_bounding_box?: GeoBoundingBox;
  filter?: QueryFilter;
  timeWindow?: string;
}
export declare const getFilterBucketAgg: ({
  getConfig,
  calculateBounds,
}: {
  getConfig: <T = any>(key: string) => T;
  calculateBounds: CalculateBoundsFn;
}) => BucketAggType<import('./bucket_agg_type').IBucketAggConfig>;
