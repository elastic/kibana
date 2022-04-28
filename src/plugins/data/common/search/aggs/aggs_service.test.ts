/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  AggsCommonService,
  AggsCommonSetupDependencies,
  AggsCommonStartDependencies,
} from './aggs_service';
import { AggTypesDependencies, getAggTypes } from './agg_types';
import { BucketAggType } from './buckets/bucket_agg_type';
import { MetricAggType } from './metrics/metric_agg_type';

describe('Aggs service', () => {
  let service: AggsCommonService;
  let setupDeps: AggsCommonSetupDependencies;
  let startDeps: AggsCommonStartDependencies;
  const aggTypesDependencies: AggTypesDependencies = {
    calculateBounds: jest.fn(),
    getFieldFormatsStart: jest.fn(),
    getConfig: jest.fn(),
    isDefaultTimezone: () => true,
  };

  beforeEach(() => {
    service = new AggsCommonService();
    setupDeps = {
      registerFunction: jest.fn(),
    };
    startDeps = {
      getConfig: jest.fn(),
      getIndexPattern: jest.fn(),
      isDefaultTimezone: jest.fn(),
    };
  });

  describe('setup()', () => {
    test('exposes proper contract', () => {
      const setup = service.setup(setupDeps);
      expect(Object.keys(setup).length).toBe(1);
      expect(setup).toHaveProperty('types');
    });

    test('instantiates a new registry', () => {
      const a = new AggsCommonService();
      const b = new AggsCommonService();
      const bSetupDeps = {
        registerFunction: jest.fn(),
      };

      const aSetup = a.setup(setupDeps);
      aSetup.types.registerBucket(
        'foo',
        () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>)
      );
      const aStart = a.start(startDeps);
      expect(aStart.types.getAll().buckets.map((t) => t(aggTypesDependencies).name))
        .toMatchInlineSnapshot(`
        Array [
          "date_histogram",
          "histogram",
          "range",
          "date_range",
          "ip_range",
          "terms",
          "multi_terms",
          "rare_terms",
          "filter",
          "filters",
          "significant_terms",
          "significant_text",
          "geohash_grid",
          "geotile_grid",
          "sampler",
          "diversified_sampler",
          "foo",
        ]
      `);
      expect(aStart.types.getAll().metrics.map((t) => t(aggTypesDependencies).name))
        .toMatchInlineSnapshot(`
        Array [
          "count",
          "avg",
          "sum",
          "median",
          "single_percentile",
          "min",
          "max",
          "std_dev",
          "cardinality",
          "percentiles",
          "percentile_ranks",
          "top_hits",
          "top_metrics",
          "derivative",
          "cumulative_sum",
          "moving_avg",
          "serial_diff",
          "avg_bucket",
          "sum_bucket",
          "min_bucket",
          "max_bucket",
          "filtered_metric",
          "geo_bounds",
          "geo_centroid",
        ]
      `);

      b.setup(bSetupDeps);
      const bStart = b.start(startDeps);
      expect(bStart.types.getAll().buckets.map((t) => t(aggTypesDependencies).name))
        .toMatchInlineSnapshot(`
        Array [
          "date_histogram",
          "histogram",
          "range",
          "date_range",
          "ip_range",
          "terms",
          "multi_terms",
          "rare_terms",
          "filter",
          "filters",
          "significant_terms",
          "significant_text",
          "geohash_grid",
          "geotile_grid",
          "sampler",
          "diversified_sampler",
        ]
      `);
      expect(bStart.types.getAll().metrics.map((t) => t(aggTypesDependencies).name))
        .toMatchInlineSnapshot(`
        Array [
          "count",
          "avg",
          "sum",
          "median",
          "single_percentile",
          "min",
          "max",
          "std_dev",
          "cardinality",
          "percentiles",
          "percentile_ranks",
          "top_hits",
          "top_metrics",
          "derivative",
          "cumulative_sum",
          "moving_avg",
          "serial_diff",
          "avg_bucket",
          "sum_bucket",
          "min_bucket",
          "max_bucket",
          "filtered_metric",
          "geo_bounds",
          "geo_centroid",
        ]
      `);
    });

    test('registers default agg types', () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length);
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length);
    });

    test('merges default agg types with types registered during setup', () => {
      const setup = service.setup(setupDeps);
      setup.types.registerBucket(
        'foo',
        () => ({ name: 'foo', type: 'buckets' } as BucketAggType<any>)
      );
      setup.types.registerMetric(
        'bar',
        () => ({ name: 'bar', type: 'metrics' } as MetricAggType<any>)
      );
      const start = service.start(startDeps);

      const aggTypes = getAggTypes();
      expect(start.types.getAll().buckets.length).toBe(aggTypes.buckets.length + 1);
      expect(start.types.getAll().buckets.some((t) => t(aggTypesDependencies).name === 'foo')).toBe(
        true
      );
      expect(start.types.getAll().metrics.length).toBe(aggTypes.metrics.length + 1);
      expect(start.types.getAll().metrics.some((t) => t(aggTypesDependencies).name === 'bar')).toBe(
        true
      );
    });

    test('registers all agg type expression functions', () => {
      service.setup(setupDeps);
      const aggTypes = getAggTypes();
      expect(setupDeps.registerFunction).toHaveBeenCalledTimes(
        aggTypes.buckets.length + aggTypes.metrics.length
      );
    });
  });

  describe('start()', () => {
    test('exposes proper contract', () => {
      const start = service.start(startDeps);
      expect(Object.keys(start).length).toBe(3);
      expect(start).toHaveProperty('calculateAutoTimeExpression');
      expect(start).toHaveProperty('createAggConfigs');
      expect(start).toHaveProperty('types');
    });

    test('types registry returns uninitialized type providers', () => {
      service.setup(setupDeps);
      const start = service.start(startDeps);
      expect(typeof start.types.get('terms')).toBe('function');
      expect(start.types.get('terms')(aggTypesDependencies).name).toBe('terms');
    });
  });
});
