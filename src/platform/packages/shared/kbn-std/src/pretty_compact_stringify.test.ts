/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { prettyCompactStringify } from './pretty_compact_stringify';

describe('prettyCompactStringify', () => {
  it('stringifies primitives correctly', () => {
    expect(prettyCompactStringify(null)).toBe('null');
    expect(prettyCompactStringify(undefined)).toBe('null');
    expect(prettyCompactStringify(true)).toBe('true');
    expect(prettyCompactStringify(false)).toBe('false');
    expect(prettyCompactStringify(42)).toBe('42');
    expect(prettyCompactStringify('hello')).toBe('"hello"');
  });

  it('keeps short arrays on a single line', () => {
    expect(prettyCompactStringify([1, 2, 3])).toBe('[1, 2, 3]');
    expect(prettyCompactStringify(['a', 'b'])).toBe('["a", "b"]');
  });

  it('keeps short objects on a single line', () => {
    expect(prettyCompactStringify({ a: 1, b: 2 })).toBe('{"a": 1, "b": 2}');
  });

  it('expands long arrays to multiple lines', () => {
    const longArray = [
      { x: 1, y: 2, description: 'point one' },
      { x: 2, y: 1, description: 'point two' },
    ];
    const result = prettyCompactStringify(longArray, { maxLength: 40 });
    expect(result).toContain('\n');
  });

  it('expands long objects to multiple lines', () => {
    const longObject = {
      name: 'test',
      description: 'a very long description that exceeds the maximum line length',
    };
    const result = prettyCompactStringify(longObject, { maxLength: 40 });
    expect(result).toContain('\n');
  });

  it('returns empty array notation for empty arrays', () => {
    expect(prettyCompactStringify([])).toBe('[]');
  });

  it('returns empty object notation for empty objects', () => {
    expect(prettyCompactStringify({})).toBe('{}');
  });

  it('respects maxLength option', () => {
    const obj = { a: 1, b: 2, c: 3 };
    // With a very small maxLength, should expand
    const result = prettyCompactStringify(obj, { maxLength: 10 });
    expect(result).toContain('\n');
  });

  it('respects indent option', () => {
    const obj = { nested: { value: 1 } };
    const result = prettyCompactStringify(obj, { maxLength: 10, indent: 4 });
    // Should have 4-space indentation
    expect(result).toContain('    ');
  });

  it('supports replacer function', () => {
    const obj = { a: 1, b: 'secret' };
    const replacer = (key: string, value: unknown) => {
      if (key === 'b') return undefined;
      return value;
    };
    expect(prettyCompactStringify(obj, { replacer })).toBe('{"a": 1}');
  });

  it('supports replacer array', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(prettyCompactStringify(obj, { replacer: ['a', 'c'] })).toBe('{"a": 1, "c": 3}');
  });

  it('handles nested structures correctly', () => {
    const obj = {
      items: [1, 2],
      meta: { count: 2 },
    };
    const result = prettyCompactStringify(obj);
    // Short enough to fit on one line with default maxLength
    expect(result).toBe('{"items": [1, 2], "meta": {"count": 2}}');
  });

  it('defaults maxLength to 80', () => {
    // Create an object that's under 80 chars but would exceed if maxLength were smaller
    const obj = { short: 'value', another: 'property' };
    const result = prettyCompactStringify(obj);
    // Should stay on one line since it's under 80 chars
    expect(result).not.toContain('\n');
  });
});
