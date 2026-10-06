/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { MetricAggType } from './metric_agg_type';
import type { BaseAggParams } from '../types';
export interface BaseAggParamsTopHit extends BaseAggParams {
  field: string;
  aggregate: 'min' | 'max' | 'sum' | 'average' | 'concat';
  size?: number;
}
export interface AggParamsTopHitSerialized extends BaseAggParamsTopHit {
  sortOrder?: 'desc' | 'asc';
  sortField?: string;
}
export interface AggParamsTopHit extends BaseAggParamsTopHit {
  sortOrder?: {
    value: 'desc' | 'asc';
    text: string;
  };
  sortField?: DataViewField;
}
export declare const getTopHitMetricAgg: () => MetricAggType<any>;
