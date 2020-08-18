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

import { AggTypesRegistry, AggTypesRegistrySetup } from './agg_types_registry';
import { BucketAggType } from './buckets/bucket_agg_type';
import { MetricAggType } from './metrics/metric_agg_type';

const bucketType = () => ({ name: 'terms', type: 'buckets' } as BucketAggType<any>);
const metricType = () => ({ name: 'count', type: 'metrics' } as MetricAggType<any>);

describe('AggTypesRegistry', () => {
  let registry: AggTypesRegistry;
  let setup: AggTypesRegistrySetup;
  let start: ReturnType<AggTypesRegistry['start']>;

  beforeEach(() => {
    registry = new AggTypesRegistry();
    setup = registry.setup();
    start = registry.start();
  });

  it('registerBucket adds new buckets', () => {
    setup.registerBucket('terms', bucketType);
    expect(start.getAll().buckets).toEqual([bucketType]);
  });

  it('registerBucket throws error when registering duplicate bucket', () => {
    expect(() => {
      setup.registerBucket('terms', bucketType);
      setup.registerBucket('terms', bucketType);
    }).toThrow(/already been registered with name: terms/);

    const fooBucket = () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>);
    const fooMetric = () => ({ name: 'foo', type: 'metrics' } as MetricAggType<any>);
    expect(() => {
      setup.registerBucket('foo', fooBucket);
      setup.registerMetric('foo', fooMetric);
    }).toThrow(/already been registered with name: foo/);
  });

  it('registerMetric adds new metrics', () => {
    setup.registerMetric('count', metricType);
    expect(start.getAll().metrics).toEqual([metricType]);
  });

  it('registerMetric throws error when registering duplicate metric', () => {
    expect(() => {
      setup.registerMetric('count', metricType);
      setup.registerMetric('count', metricType);
    }).toThrow(/already been registered with name: count/);

    const fooBucket = () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>);
    const fooMetric = () => ({ name: 'foo', type: 'metrics' } as MetricAggType<any>);
    expect(() => {
      setup.registerMetric('foo', fooMetric);
      setup.registerBucket('foo', fooBucket);
    }).toThrow(/already been registered with name: foo/);
  });

  it('gets either buckets or metrics by id', () => {
    setup.registerBucket('terms', bucketType);
    setup.registerMetric('count', metricType);
    expect(start.get('terms')).toEqual(bucketType);
    expect(start.get('count')).toEqual(metricType);
  });

  it('getAll returns all buckets and metrics', () => {
    setup.registerBucket('terms', bucketType);
    setup.registerMetric('count', metricType);
    expect(start.getAll()).toEqual({
      buckets: [bucketType],
      metrics: [metricType],
    });
  });
});
