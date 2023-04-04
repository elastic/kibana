/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { BucketAggType } from './buckets/bucket_agg_type';
import type { MetricAggType } from './metrics/metric_agg_type';
import type { AggTypesDependencies } from './agg_types';
import { legacyAggs } from './legacy_aggs';

export type AggTypesRegistrySetup = ReturnType<AggTypesRegistry['setup']>;
export type AggTypesRegistryStart = ReturnType<AggTypesRegistry['start']>;

export class AggTypesRegistry {
  private readonly bucketAggs = new Map();
  private readonly metricAggs = new Map();

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
    };
  };

  start = (aggTypesDependencies: AggTypesDependencies) => {
    const initializedAggTypes = new Map();

    const getInitializedFromCache = <T = unknown>(
      key: string,
      agg: ((aggTypesDependencies: AggTypesDependencies) => T) | undefined
    ): T | undefined => {
      if (initializedAggTypes.has(key)) {
        return initializedAggTypes.get(key);
      }
      if (!agg) {
        return;
      }
      const initialized = agg(aggTypesDependencies);
      initializedAggTypes.set(key, initialized);
      return initialized;
    };

    return {
      get: (name: string) =>
        getInitializedFromCache<BucketAggType<any> | MetricAggType<any>>(
          name,
          this.bucketAggs.get(name) || this.metricAggs.get(name) || legacyAggs.get(name)
        ),
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
