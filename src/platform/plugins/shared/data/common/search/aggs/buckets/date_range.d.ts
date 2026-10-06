/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DateRange } from '../../expressions';
import type { IBucketAggConfig } from './bucket_agg_type';
import type { BucketAggType } from './bucket_agg_type';
import type { BaseAggParams } from '../types';
import type { AggTypesDependencies } from '../agg_types';
export interface AggParamsDateRange extends BaseAggParams {
  field?: string;
  ranges?: DateRange[];
  time_zone?: string;
}
export declare const getDateRangeBucketAgg: ({
  aggExecutionContext,
  getConfig,
}: AggTypesDependencies) => BucketAggType<IBucketAggConfig>;
