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
  it('should keep 4 representative points per bucket (first, last, min, max) with their timestamps', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`' });

    // M4 aggregates: first/last timestamp and their values, min/max values and their timestamps
    expect(result).toContain('first_t = MIN(@timestamp)');
    expect(result).toContain('last_t = MAX(@timestamp)');
    expect(result).toContain('first_t_v = TOP(@timestamp, 1, "asc", `cpu.usage`)');
    expect(result).toContain('last_t_v = TOP(@timestamp, 1, "desc", `cpu.usage`)');
    expect(result).toContain('min_v = MIN(`cpu.usage`)');
    expect(result).toContain('max_v = MAX(`cpu.usage`)');
    expect(result).toContain('BY _m4_bucket = BUCKET(@timestamp, 100, ?_tstart, ?_tend)');
  });

  it('should unroll the 4 values per bucket into flat rows via MV_EXPAND for Lens compatibility', () => {
    const result = createM4Pipeline({ metricField: '`cpu.usage`' });

    expect(result).toContain('EVAL idx = [0, 1, 2, 3]');
    expect(result).toContain('MV_EXPAND idx');
    expect(result).toContain(
      '@timestamp = CASE(idx == 0, first_t, idx == 1, last_t, idx == 2, min_v_t, idx == 3, max_v_t)'
    );
    expect(result).toContain(`KEEP @timestamp, ${M4_VALUE_COLUMN}`);
    expect(result).toContain('SORT @timestamp ASC');
    expect(result).toContain('LIMIT 400');
  });
});

describe('M4 constants', () => {
  it('should export the expected column names', () => {
    expect(M4_VALUE_COLUMN).toBe('value');
    expect(M4_TIMESTAMP_COLUMN).toBe('@timestamp');
  });
});
