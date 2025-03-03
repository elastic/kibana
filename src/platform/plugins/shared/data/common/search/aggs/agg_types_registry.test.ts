/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggTypesRegistry, AggTypesRegistrySetup } from './agg_types_registry';
import type { BucketAggType } from './buckets/bucket_agg_type';
import type { MetricAggType } from './metrics/metric_agg_type';
import { fieldFormatsMock } from '@kbn/field-formats-plugin/common/mocks';
import type { AggTypesDependencies } from './agg_types';

/** @internal */
export function mockGetFieldFormatsStart() {
  const { deserialize, getDefaultInstance } = fieldFormatsMock;
  return {
    deserialize,
    getDefaultInstance,
  };
}

// Mocked uiSettings shared among aggs unit tests
const mockGetConfig = jest.fn((key) => key);

/** @internal */
export const mockAggTypesDependencies: AggTypesDependencies = {
  calculateBounds: jest.fn(),
  getFieldFormatsStart: mockGetFieldFormatsStart,
  getConfig: mockGetConfig,
};

const bucketType = { name: 'terms', type: 'buckets' } as BucketAggType<any>;
const metricType = { name: 'count', type: 'metrics' } as MetricAggType<any>;

describe('AggTypesRegistry', () => {
  let registry: AggTypesRegistry;
  let setup: AggTypesRegistrySetup;
  let start: ReturnType<AggTypesRegistry['start']>;

  beforeEach(() => {
    registry = new AggTypesRegistry();
    setup = registry.setup();
    start = registry.start({
      calculateBounds: jest.fn(),
      getFieldFormatsStart: mockGetFieldFormatsStart,
      getConfig: mockGetConfig,
    });
  });

  it('registerBucket adds new buckets', () => {
    setup.registerBucket('terms', () => bucketType);
    expect(start.getAll().buckets).toEqual([bucketType]);
  });

  it('registerBucket throws error when registering duplicate bucket', () => {
    expect(() => {
      setup.registerBucket('terms', () => bucketType);
      setup.registerBucket('terms', () => bucketType);
    }).toThrow(/already been registered with name: terms/);

    const fooBucket = () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>);
    const fooMetric = () => ({ name: 'foo', type: 'metrics' } as MetricAggType<any>);
    expect(() => {
      setup.registerBucket('foo', fooBucket);
      setup.registerMetric('foo', fooMetric);
    }).toThrow(/already been registered with name: foo/);
  });

  it('registerMetric adds new metrics', () => {
    setup.registerMetric('count', () => metricType);
    expect(start.getAll().metrics).toEqual([metricType]);
  });

  it('registerMetric throws error when registering duplicate metric', () => {
    expect(() => {
      setup.registerMetric('count', () => metricType);
      setup.registerMetric('count', () => metricType);
    }).toThrow(/already been registered with name: count/);

    const fooBucket = () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>);
    const fooMetric = () => ({ name: 'foo', type: 'metrics' } as MetricAggType<any>);
    expect(() => {
      setup.registerMetric('foo', fooMetric);
      setup.registerBucket('foo', fooBucket);
    }).toThrow(/already been registered with name: foo/);
  });

  it('gets either buckets or metrics by id', () => {
    setup.registerBucket('terms', () => bucketType);
    setup.registerMetric('count', () => metricType);
    expect(start.get('terms')).toEqual(bucketType);
    expect(start.get('count')).toEqual(metricType);
  });

  it('getAll returns all buckets and metrics', () => {
    setup.registerBucket('terms', () => bucketType);
    setup.registerMetric('count', () => metricType);
    expect(start.getAll()).toEqual({
      buckets: [bucketType],
      metrics: [metricType],
    });
  });
});
