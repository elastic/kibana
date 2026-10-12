/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  assertValidDuration,
  DURATION_REGEX,
  isValidDuration,
  MAX_DURATION_LENGTH,
  parseDuration,
} from './duration';

describe('isValidDuration', () => {
  it.each(['1ms', '30s', '5m', '2h', '1d', '1w', '1h30m', '1w2d3h4m5s6ms', '1h500ms', '0s'])(
    'accepts %s',
    (duration) => {
      expect(isValidDuration(duration)).toBe(true);
      expect(DURATION_REGEX.test(duration)).toBe(true);
    }
  );

  it.each(['', 'soon', '1m1h', '5h 30m', '1.5s', '1s1w', null, undefined, 123])(
    'rejects %p',
    (duration) => {
      expect(isValidDuration(duration)).toBe(false);
    }
  );

  it('rejects a duration longer than MAX_DURATION_LENGTH', () => {
    const atLimit = `${'1'.repeat(MAX_DURATION_LENGTH - 1)}s`;
    const overLimit = `${'1'.repeat(MAX_DURATION_LENGTH)}s`;
    expect(atLimit).toHaveLength(MAX_DURATION_LENGTH);
    expect(overLimit).toHaveLength(MAX_DURATION_LENGTH + 1);
    expect(isValidDuration(atLimit)).toBe(true);
    expect(isValidDuration(overLimit)).toBe(false);
  });
});

describe('assertValidDuration', () => {
  it('returns for a valid duration', () => {
    expect(() => assertValidDuration('1h30m')).not.toThrow();
  });

  it('throws for an invalid duration', () => {
    expect(() => assertValidDuration('soon')).toThrow(
      'Invalid duration format: soon. Use format like "1w2d3h4m5s6ms" with units in descending order.'
    );
  });
});

describe('parseDuration', () => {
  describe('valid duration formats', () => {
    test.each([
      ['500ms', 500],
      ['1ms', 1],
      ['999ms', 999],
    ])('should correctly parse milliseconds: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1s', 1000],
      ['30s', 30000],
      ['60s', 60000],
    ])('should correctly parse seconds: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1m', 60000],
      ['5m', 300000],
      ['30m', 1800000],
    ])('should correctly parse minutes: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1h', 3600000],
      ['2h', 7200000],
      ['24h', 86400000],
    ])('should correctly parse hours: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1d', 86400000],
      ['2d', 172800000],
      ['7d', 604800000],
    ])('should correctly parse days: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1w', 604800000],
      ['2w', 1209600000],
      ['4w', 2419200000],
    ])('should correctly parse weeks: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1w2d3h4m5s6ms', 604800000 + 172800000 + 10800000 + 240000 + 5000 + 6],
      ['1w1d1h1m1s1ms', 604800000 + 86400000 + 3600000 + 60000 + 1000 + 1],
    ])('should correctly parse combined durations in correct order: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['2h30m', 7200000 + 1800000],
      ['1d12h', 86400000 + 43200000],
      ['5m30s', 300000 + 30000],
      ['1w3d', 604800000 + 259200000],
      ['1h500ms', 3600000 + 500],
    ])('should correctly parse partial combinations: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['999w', 999 * 604800000],
      ['1000d', 1000 * 86400000],
      ['9999h', 9999 * 3600000],
    ])('should handle large numbers: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    it('throws for a duration longer than MAX_DURATION_LENGTH', () => {
      expect(() => parseDuration(`${'1'.repeat(MAX_DURATION_LENGTH)}s`)).toThrow(
        'Invalid duration format'
      );
    });
  });

  describe('invalid duration formats', () => {
    test.each([
      'invalid-duration',
      '5ss',
      '10m5ss',
      '1s1w',
      '3d4w',
      '2h1d',
      '5m10h',
      '1ms1s',
      '30s5m',
      '12h1d',
      '2d1w',
      '-1s',
      '0',
      '',
      '  ',
      '1.5s',
      '1,000s',
      's5',
      'ms500',
      '5x',
      '10y',
      '15z',
      'w',
      's',
      'm',
      'h',
      'd',
      'ms',
      '1w2x3h',
      '1h2m3',
      '5h 30m',
      '1h,30m',
      '2h+30m',
    ])('should throw error for invalid format: %s', (invalidDuration) => {
      expect(() => parseDuration(invalidDuration)).toThrow(
        `Invalid duration format: ${invalidDuration}. Use format like "1w2d3h4m5s6ms" with units in descending order.`
      );
    });
  });

  describe('edge cases', () => {
    test.each([
      ['0w', 0],
      ['0d', 0],
      ['0h', 0],
      ['0m', 0],
      ['0s', 0],
      ['0ms', 0],
    ])('should handle zero values for individual units: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['0w1d', 86400000],
      ['1h0m', 3600000],
      ['0s500ms', 500],
    ])('should handle combinations with zero values: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([[null], [undefined], [123], [{}], [[]]])(
      'should reject non-string inputs: %p',
      (invalidInput) => {
        expect(() => parseDuration(invalidInput as any)).toThrow('Invalid duration format');
      }
    );

    it('should handle very large valid durations', () => {
      const result = parseDuration('52w365d24h60m60s999ms');
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('order validation', () => {
    test.each(
      ['w', 'wd', 'wdh', 'wdhm', 'wdhms'].map((pattern) =>
        pattern
          .split('')
          .map((c) => `1${c}`)
          .join('')
      )
    )('should accept units in correct descending order: %s', (input) => {
      expect(() => parseDuration(input)).not.toThrow();
    });

    test.each([
      ['1d1w', 'Invalid duration format'],
      ['1h1d', 'Invalid duration format'],
      ['1m1h', 'Invalid duration format'],
      ['1s1m', 'Invalid duration format'],
      ['1ms1s', 'Invalid duration format'],
    ])('should reject units in wrong order: %s', (input, expectedError) => {
      expect(() => parseDuration(input)).toThrow(expectedError);
    });

    test.each(['1w1h', '1d1m', '1h1s', '1m1ms', '1w1ms'])(
      'should allow skipping units while maintaining order: %s',
      (input) => {
        expect(() => parseDuration(input)).not.toThrow();
      }
    );
  });

  describe('unit conversion accuracy', () => {
    test.each([
      ['1s', 1000],
      ['1m', 60 * 1000],
      ['1h', 60 * 60 * 1000],
      ['1d', 24 * 60 * 60 * 1000],
      ['1w', 7 * 24 * 60 * 60 * 1000],
    ])('should have correct millisecond conversions for %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });

    test.each([
      ['1h1m1s', 3600000 + 60000 + 1000],
      ['2h30m', 2 * 3600000 + 30 * 60000],
      ['1d1h', 86400000 + 3600000],
    ])('should correctly sum multiple units: %s', (input, expected) => {
      expect(parseDuration(input)).toBe(expected);
    });
  });
});
