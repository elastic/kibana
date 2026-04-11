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
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(system.load.`1m`)');
    });

    it('should substitute without adding backticks when not needed', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'gauge',
        metricName: 'system.load.normal',
      });
      expect(result).toBe('AVG(system.load.normal)');
    });

    it('should handle nested functions like SUM(RATE(...))', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'counter',
        metricName: 'system.network.in.bytes',
      });
      expect(result).toBe('SUM(RATE(system.network.`in`.bytes))');
    });
  });

  describe('with placeholder (no metricName)', () => {
    it('should return SUM(RATE(...)) for counter instrument', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
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
          types: [ES_FIELD_TYPES.HISTOGRAM],
          instrument,
          placeholderName,
          customFunction,
        });
        expect(template).toBe(expectedTemplate);
      });
    });

    it('should return PERCENTILE for exponential histogram type', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM],
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(??metricName, 95)');
    });

    it('should return PERCENTILE for tdigest type', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.TDIGEST],
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(??metricName, 95)');
    });

    it('should return PERCENTILE with TO_TDIGEST casting for legacy histogram', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'histogram',
        placeholderName: 'metricName',
      });
      expect(result).toBe('PERCENTILE(TO_TDIGEST(??metricName), 95)');
    });

    it('should return AVG for gauge instrument', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
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
    });
    expect(result).toBe('TBUCKET(100)');
  });
});

describe('createMetricAggregation with conflicting types', () => {
  describe('with resolved metric name and multiple types', () => {
    it('should cast double+float to double', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        metricName: 'http.request.duration',
      });
      expect(result).toBe('AVG(TO_DOUBLE(http.request.duration))');
    });

    it('should cast long+integer to long', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER],
        instrument: 'counter',
        metricName: 'requests.count',
      });
      expect(result).toBe('SUM(RATE(TO_LONG(requests.count)))');
    });

    it('should cast float+double+half_float to double with AVG', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.HALF_FLOAT],
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(TO_DOUBLE(system.load.`1m`))');
    });

    it('should not cast when types are compatible duplicates', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        metricName: 'cpu.usage',
      });
      expect(result).toBe('AVG(cpu.usage)');
    });

    it('should cast mixed float and integer types to double', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
        instrument: 'gauge',
        metricName: 'metric.value',
      });
      expect(result).toBe('AVG(TO_DOUBLE(metric.value))');
    });

    it('should handle field names with special chars in cast', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(TO_DOUBLE(system.load.`1m`))');
    });
  });

  describe('with placeholder and multiple types', () => {
    it('should cast double+float with placeholder', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        placeholderName: 'metricName',
      });
      expect(result).toBe('AVG(TO_DOUBLE(??metricName))');
    });

    it('should cast counter with placeholder', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER],
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('SUM(RATE(TO_LONG(??metricName)))');
    });
  });

  describe('incompatible types passed through for Lens to handle', () => {
    it('should pass through keyword + double without casting', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        metricName: 'field.name',
      });
      expect(result).toBe('AVG(field.name)');
    });

    it('should pass through text + long without casting', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.LONG],
        instrument: 'counter',
        metricName: 'field.name',
      });
      expect(result).toBe('SUM(RATE(field.name))');
    });

    it('should pass through date + double without casting', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        placeholderName: 'metricName',
      });
      expect(result).toBe('AVG(??metricName)');
    });
  });

  describe('single type in array', () => {
    it('should work with single type in array', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        metricName: 'cpu.usage',
      });
      expect(result).toBe('AVG(cpu.usage)');
    });

    it('should work with legacy histogram and single type', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'histogram',
        metricName: 'histogram.metric',
      });
      expect(result).toBe('PERCENTILE(TO_TDIGEST(histogram.metric), 95)');
    });

    it('should work with counter and single type', () => {
      const result = createMetricAggregation({
        types: [ES_FIELD_TYPES.HISTOGRAM],
        instrument: 'counter',
        metricName: 'requests.count',
      });
      expect(result).toBe('SUM(RATE(requests.count))');
    });
  });
});
