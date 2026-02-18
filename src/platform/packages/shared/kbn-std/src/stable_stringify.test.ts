/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { stableStringify } from './stable_stringify';

describe('stableStringify', () => {
  it('stringifies primitives correctly', () => {
    expect(stableStringify(null)).toBe('null');
    expect(stableStringify(true)).toBe('true');
    expect(stableStringify(false)).toBe('false');
    expect(stableStringify(42)).toBe('42');
    expect(stableStringify('hello')).toBe('"hello"');
  });

  it('stringifies arrays correctly', () => {
    expect(stableStringify([1, 2, 3])).toBe('[1,2,3]');
    expect(stableStringify(['a', 'b'])).toBe('["a","b"]');
  });

  it('sorts object keys alphabetically', () => {
    const obj = { z: 1, a: 2, m: 3 };
    expect(stableStringify(obj)).toBe('{"a":2,"m":3,"z":1}');
  });

  it('produces consistent output regardless of property insertion order', () => {
    const obj1 = { b: 2, a: 1 };
    const obj2 = { a: 1, b: 2 };
    expect(stableStringify(obj1)).toBe(stableStringify(obj2));
  });

  it('handles nested objects with sorted keys', () => {
    const obj = {
      z: { c: 1, a: 2 },
      a: { z: 3, b: 4 },
    };
    expect(stableStringify(obj)).toBe('{"a":{"b":4,"z":3},"z":{"a":2,"c":1}}');
  });

  it('handles circular references by replacing with [Circular]', () => {
    const obj: Record<string, unknown> = { a: 1 };
    obj.self = obj;
    expect(stableStringify(obj)).toBe('{"a":1,"self":"[Circular]"}');
  });

  it('supports the space option for pretty-printing', () => {
    const obj = { b: 2, a: 1 };
    const result = stableStringify(obj, { space: 2 });
    expect(result).toContain('\n');
    expect(result).toContain('  ');
    // Keys should still be sorted
    expect(result.indexOf('"a"')).toBeLessThan(result.indexOf('"b"'));
  });

  it('supports the space option as a string', () => {
    const obj = { a: 1 };
    const result = stableStringify(obj, { space: '\t' });
    expect(result).toContain('\t');
  });

  it('supports the replacer function option', () => {
    const obj = { a: 1, b: 'secret' };
    const replacer = (key: string, value: unknown) => {
      if (key === 'b') return '[REDACTED]';
      return value;
    };
    expect(stableStringify(obj, { replacer })).toBe('{"a":1,"b":"[REDACTED]"}');
  });

  it('supports the replacer array option', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(stableStringify(obj, { replacer: ['a', 'c'] })).toBe('{"a":1,"c":3}');
  });

  it('returns empty string for undefined', () => {
    expect(stableStringify(undefined)).toBe('');
  });
});
