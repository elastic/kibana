/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ES_FIELD_TYPES } from '@kbn/field-types';
import {
  createMetricAggregation,
  createTimeBucketAggregation,
  resolveConflictingFieldTypes,
} from './create_aggregation';

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

describe('resolveConflictingFieldTypes', () => {
  describe('single type', () => {
    it('should return the type when only one type is present', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should return undefined for empty array', () => {
      const result = resolveConflictingFieldTypes([]);
      expect(result).toBeUndefined();
    });
  });

  describe('duplicate types', () => {
    it('should return undefined when duplicates are present (no cast needed)', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });
  });

  describe('float family (double, float, half_float, scaled_float)', () => {
    const floatFamilyCases: ES_FIELD_TYPES[][] = [
      [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
      [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.DOUBLE],
      [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.HALF_FLOAT],
      [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.HALF_FLOAT],
      [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.SCALED_FLOAT],
      [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.HALF_FLOAT, ES_FIELD_TYPES.SCALED_FLOAT],
    ];

    floatFamilyCases.forEach((types) => {
      const typesName = types.join(' + ');
      it(`should resolve ${typesName} to double`, () => {
        const result = resolveConflictingFieldTypes(types);
        expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
      });
    });
  });

  describe('integer family (long, integer, short, byte)', () => {
    it('should resolve long + integer to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve integer + long to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.INTEGER, ES_FIELD_TYPES.LONG]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve long + short to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.SHORT]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve long + byte to long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.BYTE]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });

    it('should resolve integer + short + byte to long', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.INTEGER,
        ES_FIELD_TYPES.SHORT,
        ES_FIELD_TYPES.BYTE,
      ]);
      expect(result).toBe(ES_FIELD_TYPES.LONG);
    });
  });

  describe('mixed numeric families', () => {
    it('should resolve double + long to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve float + integer to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.INTEGER]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve long + double to double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });

    it('should resolve mixed float and integer family to double', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.DOUBLE,
        ES_FIELD_TYPES.FLOAT,
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.INTEGER,
      ]);
      expect(result).toBe(ES_FIELD_TYPES.DOUBLE);
    });
  });

  describe('incompatible types', () => {
    it('should return undefined for keyword + double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for text + long', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.TEXT, ES_FIELD_TYPES.LONG]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for date + double', () => {
      const result = resolveConflictingFieldTypes([ES_FIELD_TYPES.DATE, ES_FIELD_TYPES.DOUBLE]);
      expect(result).toBeUndefined();
    });

    it('should return undefined for mixed numeric + non-numeric (double + long + keyword)', () => {
      const result = resolveConflictingFieldTypes([
        ES_FIELD_TYPES.DOUBLE,
        ES_FIELD_TYPES.LONG,
        ES_FIELD_TYPES.KEYWORD,
      ]);
      expect(result).toBeUndefined();
    });
  });
});

describe('createMetricAggregation with conflicting types', () => {
  describe('with resolved metric name and multiple types', () => {
    it('should cast double+float to double', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        metricName: 'http.request.duration',
      });
      expect(result).toBe('AVG(TO_DOUBLE(http.request.duration))');
    });

    it('should cast long+integer to long', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER],
        instrument: 'counter',
        metricName: 'requests.count',
      });
      expect(result).toBe('SUM(RATE(TO_LONG(requests.count)))');
    });

    it('should cast float+double+half_float to double with AVG', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.FLOAT, ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.HALF_FLOAT],
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(TO_DOUBLE(system.load.`1m`))');
    });

    it('should not cast when types are compatible duplicates', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        metricName: 'cpu.usage',
      });
      expect(result).toBe('AVG(cpu.usage)');
    });

    it('should cast mixed float and integer types to double', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.LONG],
        instrument: 'gauge',
        metricName: 'metric.value',
      });
      expect(result).toBe('AVG(TO_DOUBLE(metric.value))');
    });

    it('should handle field names with special chars in cast', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        metricName: 'system.load.1m',
      });
      expect(result).toBe('AVG(TO_DOUBLE(system.load.`1m`))');
    });
  });

  describe('with placeholder and multiple types', () => {
    it('should cast double+float with placeholder', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.DOUBLE, ES_FIELD_TYPES.FLOAT],
        instrument: 'gauge',
        placeholderName: 'metricName',
      });
      expect(result).toBe('AVG(TO_DOUBLE(??metricName))');
    });

    it('should cast counter with placeholder', () => {
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.LONG, ES_FIELD_TYPES.INTEGER],
        instrument: 'counter',
        placeholderName: 'metricName',
      });
      expect(result).toBe('SUM(RATE(TO_LONG(??metricName)))');
    });
  });

  describe('incompatible types with multiple field types', () => {
    it('should proceed with primary type when incompatible types are detected', () => {
      // When types are incompatible (e.g., keyword + double), no cast is applied
      // The query will execute and let ES|QL surface the verification_exception
      const result = createMetricAggregation({
        type: [ES_FIELD_TYPES.KEYWORD, ES_FIELD_TYPES.DOUBLE],
        instrument: 'gauge',
        metricName: 'field.name',
      });
      // Uses the primary type without casting, will fail at query time
      expect(result).toBe('AVG(field.name)');
    });
  });

  describe('backward compatibility with single type', () => {
    it('should work with single type (not in array)', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.DOUBLE,
        instrument: 'gauge',
        metricName: 'cpu.usage',
      });
      expect(result).toBe('AVG(cpu.usage)');
    });

    it('should work with legacy histogram and single type', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'histogram',
        metricName: 'histogram.metric',
      });
      expect(result).toBe('PERCENTILE(TO_TDIGEST(histogram.metric), 95)');
    });

    it('should work with counter and single type', () => {
      const result = createMetricAggregation({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument: 'counter',
        metricName: 'requests.count',
      });
      expect(result).toBe('SUM(RATE(requests.count))');
    });
  });
});
