/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { compactTypeLabel, extractTopLevelKeys, summarizeKeyType } from './type_helpers';

describe('extractTopLevelKeys', () => {
  it('returns empty for non-object types', () => {
    expect(extractTopLevelKeys('string')).toEqual([]);
    expect(extractTopLevelKeys('Array<string>')).toEqual([]);
    expect(extractTopLevelKeys('')).toEqual([]);
  });

  it('extracts top-level keys from a flat object literal', () => {
    expect(extractTopLevelKeys('{ a: string; b: number }')).toEqual([
      { key: 'a', type: 'string' },
      { key: 'b', type: 'number' },
    ]);
  });

  it('strips optional marker from keys', () => {
    expect(extractTopLevelKeys('{ a?: string; b: number }')).toEqual([
      { key: 'a', type: 'string' },
      { key: 'b', type: 'number' },
    ]);
  });

  it('treats nested object as a single value and does not split on inner separators', () => {
    expect(extractTopLevelKeys('{ a: { nested: string; other: number }; b: boolean }')).toEqual([
      { key: 'a', type: '{ nested: string; other: number }' },
      { key: 'b', type: 'boolean' },
    ]);
  });

  it('treats generic parameters as a single value', () => {
    expect(extractTopLevelKeys('{ items: Array<string>; map: Record<string, number> }')).toEqual([
      { key: 'items', type: 'Array<string>' },
      { key: 'map', type: 'Record<string, number>' },
    ]);
  });

  it('strips a trailing // description suffix after the matching closing brace', () => {
    expect(
      extractTopLevelKeys('{ id: string; name: string } // The workflow being executed.')
    ).toEqual([
      { key: 'id', type: 'string' },
      { key: 'name', type: 'string' },
    ]);
  });

  it('handles commas as well as semicolons as separators', () => {
    expect(extractTopLevelKeys('{ a: string, b: number }')).toEqual([
      { key: 'a', type: 'string' },
      { key: 'b', type: 'number' },
    ]);
  });

  it('returns empty for an unbalanced object', () => {
    expect(extractTopLevelKeys('{ a: string; b: number')).toEqual([]);
  });

  it('ignores entries without a colon', () => {
    expect(extractTopLevelKeys('{ a: string; orphan }')).toEqual([{ key: 'a', type: 'string' }]);
  });
});

describe('summarizeKeyType', () => {
  it('returns "array" for array forms', () => {
    expect(summarizeKeyType('string[]')).toBe('array');
    expect(summarizeKeyType('Array<string>')).toBe('array');
  });

  it('returns "object" for object and record forms', () => {
    expect(summarizeKeyType('{ a: string }')).toBe('object');
    expect(summarizeKeyType('Record<string, unknown>')).toBe('object');
  });

  it('returns the short form verbatim', () => {
    expect(summarizeKeyType('string')).toBe('string');
    expect(summarizeKeyType('number')).toBe('number');
  });

  it('returns the first word for longer forms', () => {
    expect(summarizeKeyType('SomeExtremelyLongCustomType')).toBe('SomeExtremelyLongCustomType');
    expect(summarizeKeyType('AVeryVeryLongTypeName<withParam>')).toBe('AVeryVeryLongTypeName');
  });

  it('returns empty for empty input', () => {
    expect(summarizeKeyType('')).toBe('');
    expect(summarizeKeyType('   ')).toBe('');
  });
});

describe('compactTypeLabel', () => {
  it('passes short values through unchanged', () => {
    expect(compactTypeLabel('string')).toBe('string');
    expect(compactTypeLabel('{ a: string; b: number }')).toBe('{ a: string; b: number }');
  });

  it('collapses long object literals to "object"', () => {
    const long = '{ alpha: string; beta: number; gamma: boolean; delta: string }';
    expect(compactTypeLabel(long)).toBe('object');
  });

  it('collapses long array forms to "array"', () => {
    expect(compactTypeLabel('Array<SomeVeryLongType<With<Many<DeeplyNested<Parameters>>>>>')).toBe(
      'array'
    );
  });

  it('keeps short unions as-is, collapses larger unions to "mixed"', () => {
    expect(compactTypeLabel('string | number | boolean')).toBe('string | number | boolean');
    const long = 'LongTypeOne | LongTypeTwo | LongTypeThree | LongTypeFour | AnotherLongType';
    expect(compactTypeLabel(long)).toBe('mixed');
  });

  it('collapses multiline types', () => {
    expect(compactTypeLabel('string\nnumber')).toContain('…');
  });
});
