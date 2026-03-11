/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { normaliseToStringArray } from './normalise_to_string_array';

describe('normaliseToStringArray', () => {
  it('returns [s] for a non-empty string', () => {
    expect(normaliseToStringArray('foo')).toEqual(['foo']);
  });

  it('returns [""] for an empty string', () => {
    expect(normaliseToStringArray('')).toEqual(['']);
  });

  it('returns the array when given an array of strings', () => {
    expect(normaliseToStringArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('filters to only string elements when array has non-strings', () => {
    expect(normaliseToStringArray(['a', 1, null, 'b', undefined, {}])).toEqual(['a', 'b']);
  });

  it('returns [""] when array has no string elements', () => {
    expect(normaliseToStringArray([1, null, undefined, {}])).toEqual(['']);
  });

  it('returns null for null', () => {
    expect(normaliseToStringArray(null)).toBeNull();
  });

  it('returns [""] for undefined', () => {
    expect(normaliseToStringArray(undefined)).toEqual(['']);
  });

  it('returns [""] for a number', () => {
    expect(normaliseToStringArray(42)).toEqual(['']);
  });

  it('returns [""] for an empty array', () => {
    expect(normaliseToStringArray([])).toEqual(['']);
  });
});
