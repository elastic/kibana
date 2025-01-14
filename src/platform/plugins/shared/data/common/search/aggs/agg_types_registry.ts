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

export class AggTypesRegistry {
  private readonly bucketAggs = new Map();
  private readonly metricAggs = new Map();
  private readonly legacyAggs = new Map();

  setup = () => {
    return {
      registerBucket: <
        N extends string,
        T extends (deps: AggTypesDependencies) => BucketAggType<any>
      >(
        name: N,
        type: T
      ): void => {
        if (this.bucketAggs.get(name) || this.metricAggs.get(name)) {
          throw new Error(`Agg has already been registered with name: ${name}`);
        }

        this.bucketAggs.set(name, type);
      },
      registerMetric: <
        N extends string,
        T extends (deps: AggTypesDependencies) => MetricAggType<any>
      >(
        name: N,
        type: T
      ): void => {
        if (this.bucketAggs.get(name) || this.metricAggs.get(name)) {
          throw new Error(`Agg has already been registered with name: ${name}`);
        }
        this.metricAggs.set(name, type);
      },
      registerLegacy: <
        N extends string,
        T extends (deps: AggTypesDependencies) => BucketAggType<any> | MetricAggType<any>
      >(
        name: N,
        type: T
      ): void => {
        if (this.legacyAggs.get(name) || this.legacyAggs.get(name)) {
          throw new Error(`Agg has already been registered with name: ${name}`);
        }
        this.legacyAggs.set(name, type);
      },
    };
  };

  start = (aggTypesDependencies: AggTypesDependencies) => {
    const initializedAggTypes = new Map();

    const getInitializedFromCache = <T = unknown>(
      key: string,
      agg: (aggTypesDependencies: AggTypesDependencies) => T
    ): T => {
      if (initializedAggTypes.has(key)) {
        return initializedAggTypes.get(key);
      }
      const initialized = agg(aggTypesDependencies);
      initializedAggTypes.set(key, initialized);
      return initialized;
    };

    return {
      get: (name: string) => {
        const agg =
          this.bucketAggs.get(name) || this.metricAggs.get(name) || this.legacyAggs.get(name);
        return agg
          ? getInitializedFromCache<BucketAggType<any> | MetricAggType<any>>(name, agg)
          : undefined;
      },
      getAll: () => ({
        buckets: Array.from(this.bucketAggs.entries()).map(([key, value]) =>
          getInitializedFromCache<BucketAggType<any>>(key, value)
        ),
        metrics: Array.from(this.metricAggs.entries()).map(([key, value]) =>
          getInitializedFromCache<MetricAggType<any>>(key, value)
        ),
      }),
    };
  };
}
