/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import { createMetricAggregation, createTimeBucketAggregation } from './create_aggregation';

describe('createMetricAggregation', () => {
  describe('with resolved metric name (column escaping)', () => {
    it('should substitute and add backticks where needed', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(system.load.`1m`)');
    });

    it('should substitute without adding backticks when not needed', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'gauge',
        metricName: 'system.load.normal',
      });
      expect(result).toBe('AVG(system.load.normal)');
    });

    it('should handle nested functions like SUM(RATE(...))', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'counter',
        metricName: 'system.network.in.bytes',
      });
      expect(result).toBe('SUM(RATE(system.network.`in`.bytes))');
    });
  });

  describe('with placeholder (no metricName)', () => {
    it('should return SUM(RATE(...)) for counter instrument', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('SUM(RATE(??metricName))');
    });

    it('returns custom function template when customFunction is provided, ignoring instrument', () => {
      const placeholderName = 'metricName';
      const customFunction = 'custom';
      const expectedTemplate = 'CUSTOM(??metricName)';

      const instruments = ['gauge', 'counter', 'histogram'] as const;
      instruments.forEach((instrument) => {
        const template = createMetricAggregation({
          type: ES_FIELD_TYPES.HISTOGRAM,
          instrument,
          placeholderName,
          customFunction,
        });
        expect(template).toBe(expectedTemplate);
      });
    });

    it('should return PERCENTILE for exponential histogram type', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(??metricName, 95)');
    });

    it('should return PERCENTILE for tdigest type', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.TDIGEST,
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(??metricName, 95)');
    });

    it('should return PERCENTILE with TO_TDIGEST casting for legacy histogram', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'histogram',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(TO_TDIGEST(??metricName), 95)');
    });

    it('should return AVG for gauge instrument', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'gauge',
        placeholderName: 'metricName',
      });
      expect(result).toBe('AVG(??metricName)');
    });
  });
});

describe('createTimeBucketAggregation', () => {
  it('should return the correct time bucket aggregation', () => {
    const result = createTimeBucketAggregation({
      targetBuckets: 100,
      timestampField: '@timestamp',
    });
    expect(result).toBe('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
  });
});
