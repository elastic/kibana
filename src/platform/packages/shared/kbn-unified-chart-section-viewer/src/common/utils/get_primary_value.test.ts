/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPrimaryValue } from './get_primary_value';

describe('getPrimaryValue', () => {
  it('returns undefined for null', () => {
    expect(getPrimaryValue(null)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(getPrimaryValue(undefined)).toBeUndefined();
  });

  it('returns first non-null element from array', () => {
    expect(getPrimaryValue(['a', 'b'])).toBe('a');
    expect(getPrimaryValue([null, 'b'])).toBe('b');
    expect(getPrimaryValue([undefined, 'b'])).toBe('b');
    expect(getPrimaryValue([null, undefined, 'c'])).toBe('c');
  });

  it('returns undefined for empty array', () => {
    expect(getPrimaryValue([])).toBeUndefined();
  });

  it('returns undefined for array of only null/undefined', () => {
    expect(getPrimaryValue([null, undefined])).toBeUndefined();
  });

  it('returns single value as-is when not array', () => {
    expect(getPrimaryValue('single')).toBe('single');
    expect(getPrimaryValue(42)).toBe(42);
  });

  it('returns undefined for null/undefined single value', () => {
    expect(getPrimaryValue(null)).toBeUndefined();
    expect(getPrimaryValue(undefined)).toBeUndefined();
  });
});
