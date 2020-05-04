/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BucketAggType } from './buckets/bucket_agg_type';
import { MetricAggType } from './metrics/metric_agg_type';

export type AggTypesRegistrySetup = ReturnType<AggTypesRegistry['setup']>;
export type AggTypesRegistryStart = ReturnType<AggTypesRegistry['start']>;

export class AggTypesRegistry {
  private readonly bucketAggs = new Map();
  private readonly metricAggs = new Map();

  setup = () => {
    return {
      registerBucket: <T extends BucketAggType<any>>(type: T): void => {
        const { name } = type;
        if (this.bucketAggs.get(name)) {
          throw new Error(`Bucket agg has already been registered with name: ${name}`);
        }
        this.bucketAggs.set(name, type);
      },
      registerMetric: <T extends MetricAggType<any>>(type: T): void => {
        const { name } = type;
        if (this.metricAggs.get(name)) {
          throw new Error(`Metric agg has already been registered with name: ${name}`);
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
      getBuckets: () => {
        return Array.from(this.bucketAggs.values());
      },
      getMetrics: () => {
        return Array.from(this.metricAggs.values());
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
