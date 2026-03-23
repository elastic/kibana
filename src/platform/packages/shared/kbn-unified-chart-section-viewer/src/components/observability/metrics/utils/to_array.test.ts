/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toArray } from './to_array';

describe('toArray', () => {
  it('returns empty array when value is null', () => {
    expect(toArray(null)).toEqual([]);
  });

  it('returns empty array when value is undefined', () => {
    expect(toArray(undefined)).toEqual([]);
  });

  it('wraps a single value in an array', () => {
    expect(toArray('host.name')).toEqual(['host.name']);
    expect(toArray(42)).toEqual([42]);
    expect(toArray(true)).toEqual([true]);
  });

  it('returns the same array when value is already an array', () => {
    const arr = ['a', 'b', 'c'];
    expect(toArray(arr)).toBe(arr);
    expect(toArray(arr)).toEqual(['a', 'b', 'c']);
  });

  it('returns empty array when value is empty array', () => {
    expect(toArray([])).toEqual([]);
  });
});
