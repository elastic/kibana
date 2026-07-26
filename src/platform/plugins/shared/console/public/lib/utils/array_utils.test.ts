/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { asArray, asStringArray } from './array_utils';

describe('array_utils', () => {
  describe('asArray', () => {
    test('wraps a scalar value in an array', () => {
      expect(asArray('a')).toEqual(['a']);
      expect(asArray(1)).toEqual([1]);
    });

    test('returns the same array instance when already an array', () => {
      const value = ['a', 'b'];
      expect(asArray(value)).toBe(value);
    });

    test('preserves object identity', () => {
      const value = { a: 1 };
      expect(asArray(value)).toEqual([value]);
      expect(asArray([value])[0]).toBe(value);
    });
  });

  describe('asStringArray', () => {
    test('wraps a string', () => {
      expect(asStringArray('a')).toEqual(['a']);
      expect(asStringArray('ab')).toEqual(['ab']);
    });

    test('returns strings as-is when already an array', () => {
      expect(asStringArray(['a', 'b'])).toEqual(['a', 'b']);
    });

    test('filters non-string values from arrays', () => {
      const mixed: unknown[] = ['a', 1, null, undefined, {}, 'b'];
      expect(asStringArray(mixed)).toEqual(['a', 'b']);
    });

    test('returns an empty array for non-string, non-array inputs', () => {
      expect(asStringArray(null)).toEqual([]);
      expect(asStringArray(undefined)).toEqual([]);
      expect(asStringArray(1)).toEqual([]);
      expect(asStringArray({ a: 'b' })).toEqual([]);
    });
  });
});
