/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatValueAsJson, resolvePathValue, truncateForDisplay } from './resolve_path_value';

describe('resolvePathValue', () => {
  const context = {
    steps: {
      stepA: {
        output: { bla: 'value', nested: { deep: 42 } },
      },
    },
    items: [10, 20, 30],
  };

  it('resolves a nested path', () => {
    expect(resolvePathValue(context, ['steps', 'stepA', 'output', 'bla'])).toBe('value');
  });

  it('resolves deeply nested path', () => {
    expect(resolvePathValue(context, ['steps', 'stepA', 'output', 'nested', 'deep'])).toBe(42);
  });

  it('resolves array index', () => {
    expect(resolvePathValue(context, ['items', '1'])).toBe(20);
  });

  it('returns context for empty path', () => {
    expect(resolvePathValue(context, [])).toBe(context);
  });

  it('returns undefined for non-existent path', () => {
    expect(resolvePathValue(context, ['steps', 'nonExistent'])).toBeUndefined();
  });

  it('returns undefined for path through primitive', () => {
    expect(
      resolvePathValue(context, ['steps', 'stepA', 'output', 'bla', 'deeper'])
    ).toBeUndefined();
  });

  it('returns undefined for invalid array index', () => {
    expect(resolvePathValue(context, ['items', 'abc'])).toBeUndefined();
    expect(resolvePathValue(context, ['items', '-1'])).toBeUndefined();
    expect(resolvePathValue(context, ['items', '100'])).toBeUndefined();
  });

  it('returns undefined when traversing null', () => {
    expect(resolvePathValue({ val: null }, ['val', 'x'])).toBeUndefined();
  });
});

describe('truncateForDisplay', () => {
  it('returns primitives unchanged', () => {
    expect(truncateForDisplay('hello')).toBe('hello');
    expect(truncateForDisplay(42)).toBe(42);
    expect(truncateForDisplay(null)).toBe(null);
    expect(truncateForDisplay(true)).toBe(true);
  });

  it('truncates arrays beyond maxArrayItems', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = truncateForDisplay(arr, { maxArrayItems: 3 });
    expect(Array.isArray(result)).toBe(true);
    expect((result as unknown[]).length).toBe(4); // 3 items + "... 7 more items"
    expect((result as unknown[])[3]).toBe('... 7 more items');
  });

  it('truncates objects beyond maxProperties', () => {
    const obj: Record<string, number> = {};
    for (let i = 0; i < 20; i++) {
      obj[`key${i}`] = i;
    }
    const result = truncateForDisplay(obj, { maxProperties: 5 });
    expect(typeof result).toBe('object');
    const keys = Object.keys(result as Record<string, unknown>);
    expect(keys).toHaveLength(6); // 5 keys + "..."
    expect((result as Record<string, unknown>)['...']).toBe('15 more properties');
  });

  it('replaces deep objects at max depth', () => {
    const deep = { a: { b: { c: 'val' } } };
    const result = truncateForDisplay(deep, { maxDepth: 1 });
    expect(typeof result).toBe('object');
    expect((result as Record<string, unknown>).a).toMatch(/Object with/);
  });

  it('replaces deep arrays at max depth', () => {
    const deep = { arr: [1, 2, 3] };
    const result = truncateForDisplay(deep, { maxDepth: 1 });
    expect((result as Record<string, unknown>).arr).toBe('[Array(3)]');
  });
});

describe('formatValueAsJson', () => {
  it('formats values as indented JSON', () => {
    const result = formatValueAsJson({ key: 'value' });
    expect(result).toBe('{\n  "key": "value"\n}');
  });

  it('formats primitives', () => {
    expect(formatValueAsJson('hello')).toBe('"hello"');
    expect(formatValueAsJson(42)).toBe('42');
    expect(formatValueAsJson(null)).toBe('null');
  });

  it('handles non-truncated mode', () => {
    const result = formatValueAsJson({ key: 'value' }, false);
    expect(result).toBe('{\n  "key": "value"\n}');
  });
});
