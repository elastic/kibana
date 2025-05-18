/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getType } from './get_type';

describe('getType()', () => {
  test('returns "null" string for null or undefined', () => {
    expect(getType(null)).toBe('null');
    expect(getType(undefined)).toBe('null');
  });

  test('returns basic type name', () => {
    expect(getType(0)).toBe('number');
    expect(getType(1)).toBe('number');
    expect(getType(0.8)).toBe('number');
    expect(getType(Infinity)).toBe('number');

    expect(getType(true)).toBe('boolean');
    expect(getType(false)).toBe('boolean');
  });

  test('returns .type property value of objects', () => {
    expect(getType({ type: 'foo' })).toBe('foo');
    expect(getType({ type: 'bar' })).toBe('bar');
  });

  test('throws if object has no .type property', () => {
    expect(() => getType([])).toThrow();
    expect(() => getType({})).toThrow();
    expect(() => getType({ _type: 'foo' })).toThrow();
    expect(() => getType({ tipe: 'foo' })).toThrow();
  });
});
