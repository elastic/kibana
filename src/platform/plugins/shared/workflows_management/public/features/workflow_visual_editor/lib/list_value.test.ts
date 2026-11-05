/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fromTags, isTagValue, toTags } from './list_value';

describe('isTagValue', () => {
  it('accepts nothing, one string or a list of strings, and nothing else', () => {
    expect(isTagValue(undefined)).toBe(true);
    expect(isTagValue('logs-*')).toBe(true);
    expect(isTagValue(['a', 'b'])).toBe(true);
    expect(isTagValue([])).toBe(true);
    expect(isTagValue(['a', 1])).toBe(false);
    expect(isTagValue([{ id: 1 }])).toBe(false);
    expect(isTagValue({ a: 1 })).toBe(false);
    expect(isTagValue(5)).toBe(false);
  });
});

describe('toTags', () => {
  it('reads one value or a list, and treats a blank string as no value', () => {
    expect(toTags('logs-*')).toEqual(['logs-*']);
    expect(toTags(['a', 'b'])).toEqual(['a', 'b']);
    expect(toTags('  ')).toEqual([]);
    expect(toTags(undefined)).toEqual([]);
  });
});

describe('fromTags', () => {
  it('keeps one value plain when the schema allows it, and lists two or more', () => {
    expect(fromTags(['a'], true)).toBe('a');
    expect(fromTags(['a', 'b'], true)).toEqual(['a', 'b']);
  });

  it('always writes a list when one value alone is not valid', () => {
    expect(fromTags(['a'], false)).toEqual(['a']);
  });

  it('writes an empty list when nothing is left', () => {
    expect(fromTags([], true)).toEqual([]);
    expect(fromTags([], false)).toEqual([]);
  });
});
