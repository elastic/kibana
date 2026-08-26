/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { safeJsonStringify } from './safe_json_stringify';

describe('safeJsonStringify', () => {
  it('stringifies primitives correctly', () => {
    expect(safeJsonStringify(null)).toBe('null');
    expect(safeJsonStringify(true)).toBe('true');
    expect(safeJsonStringify(false)).toBe('false');
    expect(safeJsonStringify(42)).toBe('42');
    expect(safeJsonStringify('hello')).toBe('"hello"');
  });

  it('stringifies arrays correctly', () => {
    expect(safeJsonStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(safeJsonStringify(['a', 'b'])).toBe('["a","b"]');
  });

  it('stringifies objects correctly', () => {
    expect(safeJsonStringify({ a: 1, b: 2 })).toBe('{"a":1,"b":2}');
  });

  it('preserves original key order (not sorted)', () => {
    const obj = { z: 1, a: 2, m: 3 };
    // Unlike stableStringify, safeJsonStringify preserves insertion order
    expect(safeJsonStringify(obj)).toBe('{"z":1,"a":2,"m":3}');
  });

  it('omits circular references from output', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const result = safeJsonStringify(obj);
    // Circular reference is omitted (treated as undefined)
    expect(result).toBe('{"a":1}');
  });

  it('omits deeply nested circular references from output', () => {
    const obj: { a: { b: { c: unknown } } } = {
      a: {
        b: {
          c: {},
        },
      },
    };
    obj.a.b.c = obj;
    const result = safeJsonStringify(obj);
    // Circular reference in nested object is omitted
    expect(result).toBe('{"a":{"b":{}}}');
  });

  it('omits multiple circular references from output', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.ref1 = obj;
    obj.ref2 = obj;
    const result = safeJsonStringify(obj);
    // All circular references are omitted
    expect(result).toBe('{"a":1}');
  });

  it('does not call handleError when circular references are handled', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    const handleError = jest.fn(() => 'error occurred');
    const result = safeJsonStringify(obj, handleError);
    // Circular references are handled gracefully, no error
    expect(result).toBe('{"a":1}');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('returns undefined for unsupported types', () => {
    // Functions cannot be stringified
    expect(safeJsonStringify(() => {})).toBe(undefined);
  });
});
