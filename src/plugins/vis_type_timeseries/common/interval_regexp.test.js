/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { GTE_INTERVAL_RE, INTERVAL_STRING_RE } from './interval_regexp';

describe('interval_regexp', () => {
  describe('GTE_INTERVAL_RE', () => {
    test('returns true for">=12h"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).toBeTruthy();
    });
    test('returns true for ">=1y"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).toBeTruthy();
    });
    test('returns true for ">=25m"', () => {
      const value = GTE_INTERVAL_RE.test('>=12h');

      expect(value).toBeTruthy();
    });
    test('returns false "auto"', () => {
      const value = GTE_INTERVAL_RE.test('auto');

      expect(value).toBeFalsy();
    });
    test('returns false "wrongInput"', () => {
      const value = GTE_INTERVAL_RE.test('wrongInput');

      expect(value).toBeFalsy();
    });
    test('returns false "d"', () => {
      const value = GTE_INTERVAL_RE.test('d');

      expect(value).toBeFalsy();
    });

    test('returns false "y"', () => {
      const value = GTE_INTERVAL_RE.test('y');

      expect(value).toBeFalsy();
    });
  });

  describe('INTERVAL_STRING_RE', () => {
    test('returns true for "8d"', () => {
      const value = INTERVAL_STRING_RE.test('8d');

      expect(value).toBeTruthy();
    });
    test('returns true for "1y"', () => {
      const value = INTERVAL_STRING_RE.test('1y');

      expect(value).toBeTruthy();
    });
    test('returns true for "6M"', () => {
      const value = INTERVAL_STRING_RE.test('6M');

      expect(value).toBeTruthy();
    });
    test('returns false "auto"', () => {
      const value = INTERVAL_STRING_RE.test('auto');

      expect(value).toBeFalsy();
    });
    test('returns false "wrongInput"', () => {
      const value = INTERVAL_STRING_RE.test('wrongInput');

      expect(value).toBeFalsy();
    });
    test('returns false for">=21h"', () => {
      const value = INTERVAL_STRING_RE.test('>=21h');

      expect(value).toBeFalsy();
    });
  });
});
