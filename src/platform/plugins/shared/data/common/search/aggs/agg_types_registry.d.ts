/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BucketAggType } from './buckets/bucket_agg_type';
import type { MetricAggType } from './metrics/metric_agg_type';
import type { AggTypesDependencies } from './agg_types';
export type AggTypesRegistrySetup = ReturnType<AggTypesRegistry['setup']>;
export type AggTypesRegistryStart = ReturnType<AggTypesRegistry['start']>;
export declare class AggTypesRegistry {
  private readonly bucketAggs;
  private readonly metricAggs;
  private readonly legacyAggs;
  setup: () => {
    registerBucket: <
      N extends string,
      T extends (deps: AggTypesDependencies) => BucketAggType<any>
    >(
      name: N,
      type: T
    ) => void;
    registerMetric: <
      N extends string,
      T extends (deps: AggTypesDependencies) => MetricAggType<any>
    >(
      name: N,
      type: T
    ) => void;
    registerLegacy: <
      N extends string,
      T extends (deps: AggTypesDependencies) => BucketAggType<any> | MetricAggType<any>
    >(
      name: N,
      type: T
    ) => void;
  };
  start: (aggTypesDependencies: AggTypesDependencies) => {
    get: (name: string) => BucketAggType<any> | MetricAggType<any> | undefined;
    getAll: () => {
      buckets: BucketAggType<any>[];
      metrics: MetricAggType<any>[];
    };
  };
}
