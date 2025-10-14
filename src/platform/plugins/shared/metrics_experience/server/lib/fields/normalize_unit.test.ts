/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normalizeUnit } from './normalize_unit';

describe('normalizeUnit', () => {
  describe('unit mappings', () => {
    const testCases = [
      // OTEL units
      { input: 'By', fieldName: 'system.memory.usage', expected: 'bytes' },
      { input: '%', fieldName: 'system.cpu.norm.pct', expected: 'percent' },
      { input: '1', fieldName: 'system.cpu.load_average.15m', expected: 'count' },
      // ECS units
      { input: 'nanos', fieldName: 'system.disk.operation_time', expected: 'ns' },
      { input: 'micros', fieldName: 'system.disk.weighted_io_time', expected: 'us' },
    ];

    testCases.forEach(({ input, fieldName, expected }) => {
      it(`normalizes ${input} to ${expected} for ${fieldName}`, () => {
        const result = normalizeUnit({ fieldName, unit: input });
        expect(result).toBe(expected);
      });
    });

    it('should be case insensitive', () => {
      const result = normalizeUnit({ fieldName: 'system.memory.usage', unit: 'NaNoS' });
      expect(result).toBe('ns');
    });
  });

  describe('already normalized units', () => {
    const normalizedUnits = ['ns', 'us', 'ms', 's', 'm', 'h', 'd', 'percent', 'bytes', 'count'];

    normalizedUnits.forEach((unit) => {
      it(`returns ${unit} unchanged`, () => {
        const result = normalizeUnit({ fieldName: 'test.metric', unit });
        expect(result).toBe(unit);
      });
    });

    it('preserves special units of count', () => {
      const result = normalizeUnit({ fieldName: 'system.disk.operations', unit: '{operations}' });
      expect(result).toBe('{operations}');
    });
  });

  describe('ratio fields', () => {
    it('returns percent for ratio fields without unit', () => {
      const result = normalizeUnit({ fieldName: 'cpu.utilization', unit: undefined });
      expect(result).toBe('percent');
    });

    it('returns percent for ratio fields with unit equals to 1', () => {
      const result = normalizeUnit({ fieldName: 'cpu.utilization', unit: '1' });
      expect(result).toBe('percent');
    });
  });
});
