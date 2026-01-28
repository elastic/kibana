/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { hasValue } from '.';

describe('hasValue', () => {
  describe('null and undefined', () => {
    it('returns false for null', () => {
      expect(hasValue(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(hasValue(undefined)).toBe(false);
    });
  });

  describe('numbers', () => {
    it('returns true for positive numbers', () => {
      expect(hasValue(42)).toBe(true);
    });

    it('returns true for zero', () => {
      expect(hasValue(0)).toBe(true);
    });

    it('returns false for NaN', () => {
      expect(hasValue(NaN)).toBe(false);
    });
  });

  describe('strings', () => {
    it('returns true for non-empty strings', () => {
      expect(hasValue('hello')).toBe(true);
    });

    it('returns false for empty strings', () => {
      expect(hasValue('')).toBe(false);
    });
  });

  describe('booleans', () => {
    it('returns true for true', () => {
      expect(hasValue(true)).toBe(true);
    });

    it('returns true for false', () => {
      expect(hasValue(false)).toBe(true);
    });
  });

  describe('arrays', () => {
    it('returns true for arrays with valid values', () => {
      expect(hasValue([1, 2, 3])).toBe(true);
    });

    it('returns true for arrays with at least one valid value', () => {
      expect(hasValue([null, 1, undefined, NaN])).toBe(true);
    });

    it('returns false for arrays with only null values', () => {
      expect(hasValue([null, null])).toBe(false);
    });

    it('returns false for arrays with only undefined values', () => {
      expect(hasValue([undefined, undefined])).toBe(false);
    });

    it('returns false for empty arrays', () => {
      expect(hasValue([])).toBe(false);
    });

    it('returns false for arrays with only NaN values', () => {
      expect(hasValue([NaN, NaN])).toBe(false);
    });
  });
});
