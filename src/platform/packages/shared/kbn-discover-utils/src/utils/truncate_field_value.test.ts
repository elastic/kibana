/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { truncateFieldValue } from './truncate_field_value';

describe('truncateFieldValue', () => {
  it('should return the value unchanged when maxLength is undefined', () => {
    const value = 'a'.repeat(100);
    expect(truncateFieldValue(value, undefined)).toEqual({ value, isTruncated: false });
  });

  it('should return a string within the limit unchanged', () => {
    const value = 'a'.repeat(10);
    expect(truncateFieldValue(value, 10)).toEqual({ value, isTruncated: false });
  });

  it('should truncate a string exceeding the limit', () => {
    const result = truncateFieldValue('a'.repeat(20), 10);
    expect(result).toEqual({ value: 'a'.repeat(10), isTruncated: true });
  });

  it('should not cut in the middle of a surrogate pair', () => {
    const value = `${'a'.repeat(9)}😀rest`;
    const result = truncateFieldValue(value, 10);
    expect(result).toEqual({ value: 'a'.repeat(9), isTruncated: true });
  });

  it('should return an array within the cumulative limit unchanged', () => {
    const value = ['a'.repeat(5), 'b'.repeat(5)];
    const result = truncateFieldValue(value, 10);
    expect(result.isTruncated).toBe(false);
    expect(result.value).toBe(value);
  });

  it('should truncate the overflowing array element and drop the remaining ones', () => {
    const value = ['a'.repeat(5), 'b'.repeat(10), 'c'.repeat(5)];
    const result = truncateFieldValue(value, 10);
    expect(result).toEqual({ value: ['a'.repeat(5), 'b'.repeat(5)], isTruncated: true });
    // the original array is shared with copy/filter actions and must not be mutated
    expect(value).toEqual(['a'.repeat(5), 'b'.repeat(10), 'c'.repeat(5)]);
  });

  it('should drop an element when the budget is already exhausted', () => {
    const result = truncateFieldValue(['a'.repeat(10), 'b'], 10);
    expect(result).toEqual({ value: ['a'.repeat(10)], isTruncated: true });
  });

  it('should not count non-string array elements against the budget', () => {
    const value = [42, true, 'a'.repeat(10)];
    const result = truncateFieldValue(value, 10);
    expect(result.isTruncated).toBe(false);
    expect(result.value).toBe(value);
  });

  it('should return non-string values unchanged', () => {
    const value = { message: 'a'.repeat(100) };
    expect(truncateFieldValue(value, 10)).toEqual({ value, isTruncated: false });
  });
});
