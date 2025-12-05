/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractMetricFields } from './extract_metric_fields';
import type { FieldCapsFieldCapability } from '@elastic/elasticsearch/lib/api/types';

describe('extractMetricFields', () => {
  const createMockFieldCapability = (
    type: string,
    // eslint-disable-next-line @typescript-eslint/naming-convention
    time_series_metric?: 'gauge' | 'counter'
  ): FieldCapsFieldCapability => ({
    type,
    searchable: true,
    aggregatable: true,
    time_series_metric,
  });

  it('should extract a single time series metric field', () => {
    const fields = {
      'system.cpu.total.norm.pct': {
        double: createMockFieldCapability('double', 'gauge'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fieldName: 'system.cpu.total.norm.pct',
      type: 'double',
      typeInfo: fields['system.cpu.total.norm.pct'].double,
      fieldType: 'metric',
    });
  });

  it('should extract multiple time series metric fields', () => {
    const fields = {
      'system.cpu.total.norm.pct': {
        double: createMockFieldCapability('double', 'gauge'),
      },
      'system.memory.actual.used.bytes': {
        long: createMockFieldCapability('long', 'counter'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({
      fieldName: 'system.cpu.total.norm.pct',
      type: 'double',
      typeInfo: fields['system.cpu.total.norm.pct'].double,
      fieldType: 'metric',
    });
    expect(result).toContainEqual({
      fieldName: 'system.memory.actual.used.bytes',
      type: 'long',
      typeInfo: fields['system.memory.actual.used.bytes'].long,
      fieldType: 'metric',
    });
  });

  it('should not extract numeric fields without time_series_metric property', () => {
    const fields = {
      'process.pid': {
        long: createMockFieldCapability('long'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(0);
  });

  it('should not extract non-numeric fields even if they have time_series_metric', () => {
    const fields = {
      'host.name': {
        keyword: createMockFieldCapability('keyword', 'gauge'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(0);
  });

  it('should filter out metadata fields like _id', () => {
    const fields = {
      _id: {
        _id: createMockFieldCapability('_id', 'gauge'),
      },
      'system.cpu.total.norm.pct': {
        double: createMockFieldCapability('double', 'gauge'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(1);
    expect(result[0].fieldName).toBe('system.cpu.total.norm.pct');
  });

  it('should handle fields with multiple types, extracting only the valid metric', () => {
    const fields = {
      'system.load.1': {
        double: createMockFieldCapability('double', 'gauge'),
        keyword: createMockFieldCapability('keyword'),
      },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      fieldName: 'system.load.1',
      type: 'double',
      typeInfo: fields['system.load.1'].double,
      fieldType: 'metric',
    });
  });

  it('should return an empty array for empty input', () => {
    const fields = {};
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(0);
  });

  it('should correctly identify all numeric types as potential metrics', () => {
    const fields = {
      long_metric: { long: createMockFieldCapability('long', 'gauge') },
      integer_metric: { integer: createMockFieldCapability('integer', 'gauge') },
      short_metric: { short: createMockFieldCapability('short', 'gauge') },
      byte_metric: { byte: createMockFieldCapability('byte', 'gauge') },
      double_metric: { double: createMockFieldCapability('double', 'gauge') },
      float_metric: { float: createMockFieldCapability('float', 'gauge') },
      half_float_metric: { half_float: createMockFieldCapability('half_float', 'gauge') },
      scaled_float_metric: { scaled_float: createMockFieldCapability('scaled_float', 'gauge') },
      unsigned_long_metric: { unsigned_long: createMockFieldCapability('unsigned_long', 'gauge') },
      histogram_metric: { histogram: createMockFieldCapability('histogram', 'gauge') },
    };
    const result = extractMetricFields(fields);
    expect(result).toHaveLength(10);
  });
});
