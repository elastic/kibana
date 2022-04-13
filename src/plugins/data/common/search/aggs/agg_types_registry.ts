/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BucketAggType } from './buckets/bucket_agg_type';
import { MetricAggType } from './metrics/metric_agg_type';
import { AggTypesDependencies } from './agg_types';

export type AggTypesRegistrySetup = ReturnType<AggTypesRegistry['setup']>;
/**
 * AggsCommonStart returns the _unitialized_ agg type providers, but in our
 * real start contract we will need to return the initialized versions.
 * So we need to provide the correct typings so they can be overwritten
 * on client/server.
 */
export interface AggTypesRegistryStart {
  get: (id: string) => BucketAggType<any> | MetricAggType<any>;
  getAll: () => { buckets: Array<BucketAggType<any>>; metrics: Array<MetricAggType<any>> };
}

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

  start = () => {
    return {
      get: (name: string) => {
        return this.bucketAggs.get(name) || this.metricAggs.get(name);
      },
      getAll: () => {
        return {
          buckets: Array.from(this.bucketAggs.values()),
          metrics: Array.from(this.metricAggs.values()),
        };
      },
    };
  };
}
