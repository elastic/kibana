/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Duration, unitOfTime } from 'moment';
import { parseInterval, splitStringInterval } from './parse_interval';

describe('splitStringInterval', () => {
  test('should correctly split 1d interval', () => {
    expect(splitStringInterval('1d')).toMatchInlineSnapshot(`
      Object {
        "unit": "d",
        "value": 1,
      }
    `);
  });

  test('should correctly split 34m interval', () => {
    expect(splitStringInterval('1d')).toMatchInlineSnapshot(`
      Object {
        "unit": "d",
        "value": 1,
      }
    `);
  });

  test('should return null if cannot parse interval', () => {
    expect(splitStringInterval('wrong_value_1')).toMatchInlineSnapshot(`null`);
  });
});

describe('parseInterval', () => {
  const validateDuration = (duration: Duration | null, unit: unitOfTime.Base, value: number) => {
    expect(duration).toBeDefined();

    if (duration) {
      expect(duration.as(unit)).toBe(value);
    }
  };

  describe('integer', () => {
    test('should correctly parse 1d interval', () => {
      validateDuration(parseInterval('1d'), 'd', 1);
    });

    test('should correctly parse 2y interval', () => {
      validateDuration(parseInterval('2y'), 'y', 2);
    });

    test('should correctly parse 5M interval', () => {
      validateDuration(parseInterval('5M'), 'M', 5);
    });

    test('should correctly parse 5m interval', () => {
      validateDuration(parseInterval('5m'), 'm', 5);
    });

    test('should correctly parse 500m interval', () => {
      validateDuration(parseInterval('500m'), 'm', 500);
    });

    test('should correctly parse 250ms interval', () => {
      validateDuration(parseInterval('250ms'), 'ms', 250);
    });

    test('should correctly parse 100s interval', () => {
      validateDuration(parseInterval('100s'), 's', 100);
    });

    test('should correctly parse 23d interval', () => {
      validateDuration(parseInterval('23d'), 'd', 23);
    });

    test('should correctly parse 52w interval', () => {
      validateDuration(parseInterval('52w'), 'w', 52);
    });
  });

  describe('fractional interval', () => {
    test('should correctly parse fractional 2.35y interval', () => {
      validateDuration(parseInterval('2.35y'), 'y', 2.35);
    });

    test('should correctly parse fractional 1.5w interval', () => {
      validateDuration(parseInterval('1.5w'), 'w', 1.5);
    });
  });

  describe('less than 1', () => {
    test('should correctly bubble up 0.5h interval which are less than 1', () => {
      validateDuration(parseInterval('0.5h'), 'm', 30);
    });

    test('should correctly bubble up 0.5d interval which are less than 1', () => {
      validateDuration(parseInterval('0.5d'), 'h', 12);
    });
  });

  describe('unit in an interval only', () => {
    test('should correctly parse ms interval', () => {
      validateDuration(parseInterval('ms'), 'ms', 1);
    });

    test('should correctly parse d interval', () => {
      validateDuration(parseInterval('d'), 'd', 1);
    });

    test('should correctly parse m interval', () => {
      validateDuration(parseInterval('m'), 'm', 1);
    });

    test('should correctly parse y interval', () => {
      validateDuration(parseInterval('y'), 'y', 1);
    });

    test('should correctly parse M interval', () => {
      validateDuration(parseInterval('M'), 'M', 1);
    });
  });

  test('should return null for an invalid interval', () => {
    let duration = parseInterval('');
    expect(duration).toBeNull();

    // @ts-ignore
    duration = parseInterval(null);
    expect(duration).toBeNull();

    duration = parseInterval('234asdf');
    expect(duration).toBeNull();
  });
});
