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
  replaceFunctionParams,
  getAggregationTemplate,
  createTimeBucketAggregation,
  createM4Pipeline,
  M4_VALUE_COLUMN,
  M4_TIMESTAMP_COLUMN,
} from './create_aggregation';

describe('replaceFunctionParams', () => {
  it('should substitute a ?? placeholder and add backticks where needed', () => {
    const result = replaceFunctionParams('AVG(??metricField)', {
      metricField: 'system.load.1m',
    });
    expect(result).toBe('AVG(system.load.`1m`)');
  });

  it('should substitute a ?? placeholder without adding backticks when not needed', () => {
    const result = replaceFunctionParams('AVG(??metricField)', {
      metricField: 'system.load.normal',
    });
    expect(result).toBe('AVG(system.load.normal)');
  });

  it('should handle a mix of ?? and ? placeholders', () => {
    const result = replaceFunctionParams('AVG(??field) WHERE service.name == ?serviceName', {
      field: 'system.cpu.total.norm.pct',
      serviceName: 'auth-service',
    });
    expect(result).toBe('AVG(system.cpu.total.norm.pct) WHERE service.name == "auth-service"');
  });

  it('should handle nested functions like SUM(RATE(??metricField))', () => {
    const result = replaceFunctionParams('SUM(RATE(??metricField))', {
      metricField: 'system.network.in.bytes',
    });
    expect(result).toBe('SUM(RATE(system.network.`in`.bytes))');
  });
});

describe('getAggregationTemplate', () => {
  it('should return SUM as default', () => {
    const result = getAggregationTemplate({
      type: ES_FIELD_TYPES.HISTOGRAM,
      instrument: 'counter',
      placeholderName: 'metricName',
    });
    expect(result).toBe('SUM(RATE(??metricName))');
  });

  it('returns custom function template when customFunction is provided, ignoring instrument', () => {
    const placeholderName = 'metricName';
    const customFunction = 'custom';
    const expectedTemplate = 'custom(??metricName)';

    const instruments = ['gauge', 'counter', 'histogram'] as const;
    instruments.forEach((instrument) => {
      const template = getAggregationTemplate({
        type: ES_FIELD_TYPES.HISTOGRAM,
        instrument,
        placeholderName,
        customFunction,
      });
      expect(template).toBe(expectedTemplate);
    });
  });

  it('should return PERCENTILE for exponential histogram instrument', () => {
    const result = getAggregationTemplate({
      type: ES_FIELD_TYPES.EXPONENTIAL_HISTOGRAM,
      instrument: 'counter',
      placeholderName: 'metricName',
    });
    expect(result).toBe('PERCENTILE(??metricName, 95)');
  });

  it('should return PERCENTILE for tdigest instrument', () => {
    const result = getAggregationTemplate({
      type: ES_FIELD_TYPES.TDIGEST,
      instrument: 'counter',
      placeholderName: 'metricName',
    });
    expect(result).toBe('PERCENTILE(??metricName, 95)');
  });

  it('should return PERCENTILE with to_tdigest casting for legacy histogram', () => {
    const result = getAggregationTemplate({
      type: ES_FIELD_TYPES.HISTOGRAM,
      instrument: 'histogram',
      placeholderName: 'metricName',
    });
    expect(result).toBe('PERCENTILE(TO_TDIGEST(??metricName), 95)');
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

describe('createM4Pipeline', () => {
  it('should generate the M4 STATS + unrolling pipeline with defaults', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`' });

    expect(result).toContain('STATS');
    expect(result).toContain('first_t = MIN(@timestamp)');
    expect(result).toContain('last_t = MAX(@timestamp)');
    expect(result).toContain('first_t_v = TOP(@timestamp, 1, "asc", `cpu.usage`)');
    expect(result).toContain('last_t_v = TOP(@timestamp, 1, "desc", `cpu.usage`)');
    expect(result).toContain('min_v = MIN(`cpu.usage`)');
    expect(result).toContain('max_v = MAX(`cpu.usage`)');
    expect(result).toContain('min_v_t = TOP(`cpu.usage`, 1, "asc", @timestamp)');
    expect(result).toContain('max_v_t = TOP(`cpu.usage`, 1, "desc", @timestamp)');
    expect(result).toContain('BY _m4_bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
  });

  it('should include MV_EXPAND unrolling with CASE expressions', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`' });

    expect(result).toContain('EVAL idx = [0, 1, 2, 3]');
    expect(result).toContain('MV_EXPAND idx');
    expect(result).toContain(
      '@timestamp = CASE(idx == 0, first_t, idx == 1, last_t, idx == 2, min_v_t, idx == 3, max_v_t)'
    );
    expect(result).toContain(
      `${M4_VALUE_COLUMN} = CASE(idx == 0, first_t_v, idx == 1, last_t_v, idx == 2, min_v, idx == 3, max_v)`
    );
  });

  it('should KEEP only timestamp and value columns, then SORT and LIMIT', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`', targetBuckets: 200 });

    expect(result).toContain(`KEEP @timestamp, ${M4_VALUE_COLUMN}`);
    expect(result).toContain('SORT @timestamp ASC');
    expect(result).toContain('LIMIT 800');
  });

  it('should respect custom targetBuckets', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`', targetBuckets: 500 });

    expect(result).toContain('BUCKET(@timestamp, 500, ?_tstart, ?_tend)');
    expect(result).toContain('LIMIT 2000');
  });

  it('should respect custom timestampField', () => {
    const result = createM4Pipeline({
      metricField: '`cpu.usage`',
      timestampField: 'event.timestamp',
    });

    expect(result).toContain('first_t = MIN(event.timestamp)');
    expect(result).toContain('BUCKET(event.timestamp, 100, ?_tstart, ?_tend)');
    expect(result).toContain('KEEP @timestamp, value');
    expect(result).toContain('SORT @timestamp ASC');
  });

  it('should respect custom outputTimestampField', () => {
    const result = createM4Pipeline({
      metricField: '`cpu.usage`',
      timestampField: 'bucket_time',
      outputTimestampField: 'my_ts',
    });

    expect(result).toContain('first_t = MIN(bucket_time)');
    expect(result).toContain('BUCKET(bucket_time, 100, ?_tstart, ?_tend)');
    expect(result).toContain('KEEP my_ts, value');
    expect(result).toContain('SORT my_ts ASC');
  });
});

describe('M4 constants', () => {
  it('should export the expected column names', () => {
    expect(M4_VALUE_COLUMN).toBe('value');
    expect(M4_TIMESTAMP_COLUMN).toBe('@timestamp');
  });
});
