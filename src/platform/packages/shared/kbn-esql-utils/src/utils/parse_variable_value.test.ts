/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parseVariableValue } from './parse_variable_value';

describe('parseVariableValue', () => {
  describe('array inputs', () => {
    it('should return existing arrays unchanged', () => {
      expect(parseVariableValue(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
      expect(parseVariableValue([1, 2, 3])).toEqual([1, 2, 3]);
      expect(parseVariableValue([])).toEqual([]);
    });
  });

  describe('JSON array strings', () => {
    it('should parse valid JSON string arrays', () => {
      expect(parseVariableValue('["Women\'s Clothing", "Women\'s Shoes"]')).toEqual([
        "Women's Clothing",
        "Women's Shoes",
      ]);
      expect(parseVariableValue('["apple", "banana", "cherry"]')).toEqual([
        'apple',
        'banana',
        'cherry',
      ]);
    });

    it('should parse valid JSON number arrays', () => {
      expect(parseVariableValue('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(parseVariableValue('["1", "2", "3"]')).toEqual([1, 2, 3]);
    });
  });

  describe('bracket notation strings (non-JSON)', () => {
    it('should parse comma-separated string values in brackets', () => {
      expect(parseVariableValue(`[Women's Clothing, Women's Shoes]`)).toEqual([
        "Women's Clothing",
        "Women's Shoes",
      ]);
      expect(parseVariableValue('[apple, banana, cherry]')).toEqual(['apple', 'banana', 'cherry']);
    });

    it('should parse comma-separated numeric values in brackets as number array', () => {
      expect(parseVariableValue('[1, 2, 3]')).toEqual([1, 2, 3]);
      expect(parseVariableValue('[10, 20, 30]')).toEqual([10, 20, 30]);
    });
  });

  describe('regular string inputs', () => {
    it('should convert numeric strings to numbers', () => {
      expect(parseVariableValue('123')).toBe(123);
      expect(parseVariableValue('0')).toBe(0);
      expect(parseVariableValue('-456')).toBe(-456);
      expect(parseVariableValue('3.14')).toBe(3.14);
    });

    it('should keep non-numeric strings as strings', () => {
      expect(parseVariableValue('apple')).toBe('apple');
      expect(parseVariableValue(`Women's Clothing`)).toBe("Women's Clothing");
    });
  });

  describe('type consistency', () => {
    it('should return string[] for all-string arrays', () => {
      const result = parseVariableValue('[apple, banana]');
      expect(result).toEqual(['apple', 'banana']);
      expect(Array.isArray(result) && result.every((item) => typeof item === 'string')).toBe(true);
    });

    it('should return number[] for all-numeric arrays', () => {
      const result = parseVariableValue('[1, 2, 3]');
      expect(result).toEqual([1, 2, 3]);
      expect(Array.isArray(result) && result.every((item) => typeof item === 'number')).toBe(true);
    });
  });
});
