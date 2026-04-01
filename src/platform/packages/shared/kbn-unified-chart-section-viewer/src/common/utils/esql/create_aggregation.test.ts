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
  computeTargetBuckets,
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

  it('should default to 100 buckets when no targetBuckets is provided', () => {
    const result = createTimeBucketAggregation({});
    expect(result).toBe('BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
  });

  it('should use a custom targetBuckets value', () => {
    const result = createTimeBucketAggregation({ targetBuckets: 15 });
    expect(result).toBe('BUCKET(@timestamp, 15, ?_tstart, ?_tend)');
  });
});

describe('computeTargetBuckets', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-31T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('relative time ranges', () => {
    it.each`
      label           | from          | to       | expected
      ${'15 minutes'} | ${'now-15m'}  | ${'now'} | ${15}
      ${'30 minutes'} | ${'now-30m'}  | ${'now'} | ${30}
      ${'45 minutes'} | ${'now-45m'}  | ${'now'} | ${45}
      ${'1 hour'}     | ${'now-1h'}   | ${'now'} | ${60}
      ${'2 hours'}    | ${'now-2h'}   | ${'now'} | ${100}
      ${'3 hours'}    | ${'now-3h'}   | ${'now'} | ${100}
      ${'4 hours'}    | ${'now-4h'}   | ${'now'} | ${100}
      ${'6 hours'}    | ${'now-6h'}   | ${'now'} | ${100}
      ${'12 hours'}   | ${'now-12h'}  | ${'now'} | ${100}
      ${'24 hours'}   | ${'now-24h'}  | ${'now'} | ${100}
      ${'2 days'}     | ${'now-48h'}  | ${'now'} | ${100}
      ${'1 month'}    | ${'now-30d'}  | ${'now'} | ${100}
      ${'1 year'}     | ${'now-365d'} | ${'now'} | ${100}
    `('should return $expected buckets for a $label range', ({ from, to, expected }) => {
      expect(computeTargetBuckets({ from, to })).toBe(expected);
    });

    it('should return 96 for 8 hours because calculateAuto.near jumps from 1m to 5m intervals', () => {
      expect(computeTargetBuckets({ from: 'now-8h', to: 'now' })).toBe(96);
    });
  });

  describe('absolute time ranges', () => {
    it('should return 15 for a 15-minute absolute range', () => {
      expect(
        computeTargetBuckets({
          from: '2026-03-31T11:45:00Z',
          to: '2026-03-31T12:00:00Z',
        })
      ).toBe(15);
    });

    it('should return 60 for a 1-hour absolute range', () => {
      expect(
        computeTargetBuckets({
          from: '2026-03-31T11:00:00Z',
          to: '2026-03-31T12:00:00Z',
        })
      ).toBe(60);
    });

    it('should return 100 for a 24-hour absolute range', () => {
      expect(
        computeTargetBuckets({
          from: '2026-03-30T12:00:00Z',
          to: '2026-03-31T12:00:00Z',
        })
      ).toBe(100);
    });
  });

  describe('edge cases', () => {
    it('should return 100 when timeRange is undefined', () => {
      expect(computeTargetBuckets(undefined)).toBe(100);
    });

    it('should return at least 1 for very short ranges', () => {
      expect(computeTargetBuckets({ from: 'now-10s', to: 'now' })).toBe(1);
    });

    it('should return 100 for unparseable date strings', () => {
      expect(computeTargetBuckets({ from: 'invalid', to: 'also-invalid' })).toBe(100);
    });
  });
});
