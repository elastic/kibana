/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseDuration } from './parse-duration';

describe('parseDuration', () => {
  describe('valid duration formats', () => {
    it('should correctly parse milliseconds', () => {
      expect(parseDuration('500ms')).toBe(500);
      expect(parseDuration('1ms')).toBe(1);
      expect(parseDuration('999ms')).toBe(999);
    });

    it('should correctly parse seconds', () => {
      expect(parseDuration('1s')).toBe(1000);
      expect(parseDuration('30s')).toBe(30000);
      expect(parseDuration('60s')).toBe(60000);
    });

    it('should correctly parse minutes', () => {
      expect(parseDuration('1m')).toBe(60000);
      expect(parseDuration('5m')).toBe(300000);
      expect(parseDuration('30m')).toBe(1800000);
    });

    it('should correctly parse hours', () => {
      expect(parseDuration('1h')).toBe(3600000);
      expect(parseDuration('2h')).toBe(7200000);
      expect(parseDuration('24h')).toBe(86400000);
    });

    it('should correctly parse days', () => {
      expect(parseDuration('1d')).toBe(86400000);
      expect(parseDuration('2d')).toBe(172800000);
      expect(parseDuration('7d')).toBe(604800000);
    });

    it('should correctly parse weeks', () => {
      expect(parseDuration('1w')).toBe(604800000);
      expect(parseDuration('2w')).toBe(1209600000);
      expect(parseDuration('4w')).toBe(2419200000);
    });

    it('should correctly parse combined durations in correct order', () => {
      expect(parseDuration('1w2d3h4m5s6ms')).toBe(
        604800000 + // 1w
          172800000 + // 2d
          10800000 + // 3h
          240000 + // 4m
          5000 + // 5s
          6 // 6ms
      );

      expect(parseDuration('1w1d1h1m1s1ms')).toBe(
        604800000 + // 1w
          86400000 + // 1d
          3600000 + // 1h
          60000 + // 1m
          1000 + // 1s
          1 // 1ms
      );
    });

    it('should correctly parse partial combinations', () => {
      expect(parseDuration('2h30m')).toBe(7200000 + 1800000);
      expect(parseDuration('1d12h')).toBe(86400000 + 43200000);
      expect(parseDuration('5m30s')).toBe(300000 + 30000);
      expect(parseDuration('1w3d')).toBe(604800000 + 259200000);
      expect(parseDuration('1h500ms')).toBe(3600000 + 500);
    });

    it('should handle large numbers', () => {
      expect(parseDuration('999w')).toBe(999 * 604800000);
      expect(parseDuration('1000d')).toBe(1000 * 86400000);
      expect(parseDuration('9999h')).toBe(9999 * 3600000);
    });
  });

  describe('invalid duration formats', () => {
    test.each([
      // Invalid format
      'invalid-duration',
      '5ss', // double unit
      '10m5ss', // double unit
      '1s1w', // wrong order
      '3d4w', // wrong order
      '2h1d', // wrong order
      '5m10h', // wrong order
      '1ms1s', // wrong order
      '30s5m', // wrong order
      '12h1d', // wrong order
      '2d1w', // wrong order
      // Invalid values
      '-1s', // negative
      '0', // no unit
      '', // empty string
      '  ', // whitespace only
      '1.5s', // decimal
      '1,000s', // comma
      's5', // unit before number
      'ms500', // unit before number
      '5x', // invalid unit
      '10y', // invalid unit
      '15z', // invalid unit
      // Missing parts
      'w', // no number
      's', // no number
      'm', // no number
      'h', // no number
      'd', // no number
      'ms', // no number
      // Mixed invalid
      '1w2x3h', // invalid unit in middle
      '1h2m3', // missing unit at end
      '5h 30m', // space between units
      '1h,30m', // comma between units
      '2h+30m', // plus between units
    ])('should throw error for invalid format: %s', (invalidDuration) => {
      expect(() => parseDuration(invalidDuration)).toThrow(
        `Invalid duration format: ${invalidDuration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
      );
    });
  });

  describe('edge cases', () => {
    it('should handle zero values for individual units', () => {
      expect(parseDuration('0w')).toBe(0);
      expect(parseDuration('0d')).toBe(0);
      expect(parseDuration('0h')).toBe(0);
      expect(parseDuration('0m')).toBe(0);
      expect(parseDuration('0s')).toBe(0);
      expect(parseDuration('0ms')).toBe(0);
    });

    it('should handle combinations with zero values', () => {
      expect(parseDuration('0w1d')).toBe(86400000);
      expect(parseDuration('1h0m')).toBe(3600000);
      expect(parseDuration('0s500ms')).toBe(500);
    });

    it('should reject non-string inputs', () => {
      expect(() => parseDuration(null as any)).toThrow('Invalid duration format');
      expect(() => parseDuration(undefined as any)).toThrow('Invalid duration format');
      expect(() => parseDuration(123 as any)).toThrow('Invalid duration format');
      expect(() => parseDuration({} as any)).toThrow('Invalid duration format');
      expect(() => parseDuration([] as any)).toThrow('Invalid duration format');
    });

    it('should handle very large valid durations', () => {
      const result = parseDuration('52w365d24h60m60s999ms');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('order validation', () => {
    it('should accept units in correct descending order', () => {
      expect(() => parseDuration('1w')).not.toThrow();
      expect(() => parseDuration('1w1d')).not.toThrow();
      expect(() => parseDuration('1w1d1h')).not.toThrow();
      expect(() => parseDuration('1w1d1h1m')).not.toThrow();
      expect(() => parseDuration('1w1d1h1m1s')).not.toThrow();
      expect(() => parseDuration('1w1d1h1m1s1ms')).not.toThrow();
    });

    it('should reject units in wrong order', () => {
      expect(() => parseDuration('1d1w')).toThrow('Invalid duration format');
      expect(() => parseDuration('1h1d')).toThrow('Invalid duration format');
      expect(() => parseDuration('1m1h')).toThrow('Invalid duration format');
      expect(() => parseDuration('1s1m')).toThrow('Invalid duration format');
      expect(() => parseDuration('1ms1s')).toThrow('Invalid duration format');
    });

    it('should allow skipping units while maintaining order', () => {
      expect(() => parseDuration('1w1h')).not.toThrow(); // skip days
      expect(() => parseDuration('1d1m')).not.toThrow(); // skip hours
      expect(() => parseDuration('1h1s')).not.toThrow(); // skip minutes
      expect(() => parseDuration('1m1ms')).not.toThrow(); // skip seconds
      expect(() => parseDuration('1w1ms')).not.toThrow(); // skip multiple units
    });
  });

  describe('unit conversion accuracy', () => {
    it('should have correct millisecond conversions', () => {
      expect(parseDuration('1s')).toBe(1000);
      expect(parseDuration('1m')).toBe(60 * 1000);
      expect(parseDuration('1h')).toBe(60 * 60 * 1000);
      expect(parseDuration('1d')).toBe(24 * 60 * 60 * 1000);
      expect(parseDuration('1w')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should correctly sum multiple units', () => {
      // Test specific combinations that are easy to verify
      expect(parseDuration('1h1m1s')).toBe(3600000 + 60000 + 1000); // 3661000ms
      expect(parseDuration('2h30m')).toBe(2 * 3600000 + 30 * 60000); // 9000000ms
      expect(parseDuration('1d1h')).toBe(86400000 + 3600000); // 90000000ms
    });
  });
});
