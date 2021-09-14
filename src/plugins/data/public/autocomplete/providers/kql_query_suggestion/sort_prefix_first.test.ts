/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { sortPrefixFirst } from './sort_prefix_first';

describe('sortPrefixFirst', () => {
  test('should return the original unmodified array if no prefix is provided', () => {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array);

    expect(result).toBe(array);
    expect(result).toEqual(['foo', 'bar', 'baz']);
  });

  test('should sort items that match the prefix first without modifying the original array', () => {
    const array = ['foo', 'bar', 'baz'];
    const result = sortPrefixFirst(array, 'b');

    expect(result).not.toBe(array);
    expect(result).toEqual(['bar', 'baz', 'foo']);
    expect(array).toEqual(['foo', 'bar', 'baz']);
  });

  test('should not modify the order of the array other than matching prefix without modifying the original array', () => {
    const array = ['foo', 'bar', 'baz', 'qux', 'quux'];
    const result = sortPrefixFirst(array, 'b');

    expect(result).not.toBe(array);
    expect(result).toEqual(['bar', 'baz', 'foo', 'qux', 'quux']);
    expect(array).toEqual(['foo', 'bar', 'baz', 'qux', 'quux']);
  });

  test('should sort objects by property if provided', () => {
    const array = [
      { name: 'foo' },
      { name: 'bar' },
      { name: 'baz' },
      { name: 'qux' },
      { name: 'quux' },
    ];
    const result = sortPrefixFirst(array, 'b', 'name');

    expect(result).not.toBe(array);
    expect(result).toEqual([
      { name: 'bar' },
      { name: 'baz' },
      { name: 'foo' },
      { name: 'qux' },
      { name: 'quux' },
    ]);
    expect(array).toEqual([
      { name: 'foo' },
      { name: 'bar' },
      { name: 'baz' },
      { name: 'qux' },
      { name: 'quux' },
    ]);
  });

  test('should handle numbers', () => {
    const array = [1, 50, 5];
    const result = sortPrefixFirst(array, 5);

    expect(result).not.toBe(array);
    expect(result).toEqual([50, 5, 1]);
  });

  test('should handle mixed case', () => {
    const array = ['Date Histogram', 'Histogram'];
    const prefix = 'histo';
    const result = sortPrefixFirst(array, prefix);

    expect(result).not.toBe(array);
    expect(result).toEqual(['Histogram', 'Date Histogram']);
  });
});
