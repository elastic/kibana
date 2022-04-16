/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAggTypes } from '.';
import { mockGetFieldFormatsStart } from './test_helpers';

import { isBucketAggType } from './buckets/bucket_agg_type';
import { isMetricAggType } from './metrics/metric_agg_type';

describe('AggTypesComponent', () => {
  const aggTypes = getAggTypes();
  const { buckets, metrics } = aggTypes;
  const aggTypesDependencies = {
    calculateBounds: jest.fn(),
    getConfig: jest.fn(),
    getFieldFormatsStart: mockGetFieldFormatsStart,
    isDefaultTimezone: jest.fn().mockReturnValue(true),
  };

  describe('bucket aggs', () => {
    test('all extend BucketAggType', () => {
      buckets.forEach(({ fn }) => {
        expect(isBucketAggType(fn(aggTypesDependencies))).toBeTruthy();
      });
    });
  });

  describe('metric aggs', () => {
    test('all extend MetricAggType', () => {
      metrics.forEach(({ fn }) => {
        expect(isMetricAggType(fn(aggTypesDependencies))).toBeTruthy();
      });
    });
  });
});
