/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonObject } from '@kbn/utility-types';
import { formatValueAsJson, resolvePathValue, truncateForDisplay } from './resolve_path_value';

describe('resolvePathValue - additional coverage', () => {
  it('returns undefined when context is traversed through undefined', () => {
    const context = { a: undefined } as unknown as JsonObject;
    expect(resolvePathValue(context, ['a', 'b'])).toBeUndefined();
  });

  it('resolves to a boolean false value', () => {
    const context = { enabled: false };
    expect(resolvePathValue(context, ['enabled'])).toBe(false);
  });

  it('resolves to zero', () => {
    const context = { count: 0 };
    expect(resolvePathValue(context, ['count'])).toBe(0);
  });

  it('resolves to an empty string', () => {
    const context = { name: '' };
    expect(resolvePathValue(context, ['name'])).toBe('');
  });

  it('resolves array element at index 0', () => {
    const context = { list: ['first', 'second'] };
    expect(resolvePathValue(context, ['list', '0'])).toBe('first');
  });

  it('returns the whole sub-object when path stops at an object', () => {
    const context = { nested: { a: 1, b: 2 } };
    const result = resolvePathValue(context, ['nested']);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('returns undefined when array index is negative', () => {
    const context = { items: [1, 2, 3] };
    expect(resolvePathValue(context, ['items', '-1'])).toBeUndefined();
  });

  it('returns undefined when array index is not a number', () => {
    const context = { items: [1, 2, 3] };
    expect(resolvePathValue(context, ['items', 'not_a_number'])).toBeUndefined();
  });

  it('handles deeply nested arrays', () => {
    const context = { data: [[['deep']]] };
    expect(resolvePathValue(context, ['data', '0', '0', '0'])).toBe('deep');
  });

  it('returns the whole array when path stops at an array', () => {
    const context = { items: [1, 2, 3] };
    expect(resolvePathValue(context, ['items'])).toEqual([1, 2, 3]);
  });

  it('resolves numeric key on an object (not an array)', () => {
    const context = { '0': 'zero-key' };
    expect(resolvePathValue(context, ['0'])).toBe('zero-key');
  });

  it('returns undefined when traversing through null', () => {
    const context = { a: null };
    expect(resolvePathValue(context, ['a', 'b'])).toBeUndefined();
  });
});

describe('truncateForDisplay - additional coverage', () => {
  it('returns primitives at max depth without conversion', () => {
    expect(truncateForDisplay(42, { maxDepth: 0 })).toBe(42);
    expect(truncateForDisplay('hello', { maxDepth: 0 })).toBe('hello');
    expect(truncateForDisplay(true, { maxDepth: 0 })).toBe(true);
  });

  it('truncates array to the exact maxArrayItems limit', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = truncateForDisplay(arr, { maxArrayItems: 5 });
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it('does not add truncation message when array length equals maxArrayItems', () => {
    const arr = [1, 2, 3];
    const result = truncateForDisplay(arr, { maxArrayItems: 3 });
    expect(result).toEqual([1, 2, 3]);
  });

  it('truncates object to the exact maxProperties limit', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = truncateForDisplay(obj, { maxProperties: 3 });
    expect(Object.keys(result as Record<string, unknown>)).toEqual(['a', 'b', 'c']);
  });

  it('handles nested objects within arrays at depth', () => {
    const data = [{ key: 'val' }, { key: 'val2' }];
    const result = truncateForDisplay(data, { maxDepth: 2, maxArrayItems: 10 });
    expect(result).toEqual([{ key: 'val' }, { key: 'val2' }]);
  });

  it('handles empty array', () => {
    expect(truncateForDisplay([])).toEqual([]);
  });

  it('handles empty object', () => {
    expect(truncateForDisplay({})).toEqual({});
  });

  it('handles null values inside objects', () => {
    const obj = { a: null, b: 'valid' };
    const result = truncateForDisplay(obj);
    expect(result).toEqual({ a: null, b: 'valid' });
  });

  it('handles boolean false correctly', () => {
    expect(truncateForDisplay(false)).toBe(false);
  });
});

describe('formatValueAsJson - additional coverage', () => {
  it('formats an array as JSON', () => {
    const result = formatValueAsJson([1, 2, 3]);
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });

  it('formats a boolean', () => {
    expect(formatValueAsJson(true)).toBe('true');
    expect(formatValueAsJson(false)).toBe('false');
  });

  it('handles circular references gracefully by returning string fallback', () => {
    // JSON.stringify will throw on circular references, so the catch branch is hit
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = formatValueAsJson(circular as never, false);
    expect(typeof result).toBe('string');
  });

  it('formats a deeply nested truncated object', () => {
    const deepObj = { a: { b: { c: { d: { e: 'deep' } } } } };
    const result = formatValueAsJson(deepObj, true);
    expect(typeof result).toBe('string');
    expect(result).toContain('"a"');
  });
});
