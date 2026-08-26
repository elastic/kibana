/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { inferFieldType } from './infer_field_type';

describe('inferFieldType', () => {
  describe('null and undefined', () => {
    it.each([
      [null, 'unknown'],
      [undefined, 'unknown'],
    ])('returns "unknown" for %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });
  });

  describe('strings', () => {
    it.each([
      ['hello', 'string'],
      ['', 'string'],
      ['123', 'string'],
      ['true', 'string'],
      ['not-a-date', 'string'],
      ['2024-13-45', 'string'], // invalid date but matches pattern - Date.parse returns NaN
    ])('returns "string" for %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });
  });

  describe('dates', () => {
    it.each([
      ['2024-01-15', 'date'],
      ['2024-01-15T10:30:00Z', 'date'],
      ['2024-01-15T10:30:00.000Z', 'date'],
      ['2024-12-31T23:59:59+05:00', 'date'],
    ])('returns "date" for %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });

    it('does not infer date for strings that look like dates but are invalid', () => {
      // "2024-99-99" fails Date.parse so it stays as string
      expect(inferFieldType('2024-99-99')).toBe('string');
    });
  });

  describe('numbers', () => {
    it.each([
      [0, 'long'],
      [1, 'long'],
      [-42, 'long'],
      [Number.MAX_SAFE_INTEGER, 'long'],
    ])('returns "long" for integer %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });

    it.each([
      [1.5, 'double'],
      [-0.001, 'double'],
      [3.14159, 'double'],
      [Number.MIN_VALUE, 'double'],
    ])('returns "double" for float %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });
  });

  describe('booleans', () => {
    it.each([
      [true, 'boolean'],
      [false, 'boolean'],
    ])('returns "boolean" for %s', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });
  });

  describe('objects', () => {
    it.each([
      [{ key: 'value' }, 'object'],
      [{}, 'object'],
      [{ nested: { deep: true } }, 'object'],
    ])('returns "object" for %j', (value, expected) => {
      expect(inferFieldType(value)).toBe(expected);
    });
  });

  describe('arrays', () => {
    it('infers type from the first element of an array', () => {
      expect(inferFieldType(['hello', 'world'])).toBe('string');
      expect(inferFieldType([42, 43])).toBe('long');
      expect(inferFieldType([1.5, 2.5])).toBe('double');
      expect(inferFieldType([true, false])).toBe('boolean');
      expect(inferFieldType([{ a: 1 }])).toBe('object');
    });

    it('returns "unknown" for an empty array', () => {
      // empty array -> inferFieldType(undefined) -> 'unknown'
      expect(inferFieldType([])).toBe('unknown');
    });

    it('handles nested arrays by recursing into the first element', () => {
      expect(inferFieldType([['nested']])).toBe('string');
      expect(inferFieldType([[42]])).toBe('long');
    });

    it('handles arrays where the first element is null', () => {
      expect(inferFieldType([null, 'hello'])).toBe('unknown');
    });
  });
});
