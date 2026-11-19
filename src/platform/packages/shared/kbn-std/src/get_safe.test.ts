/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getSafe } from './get_safe';

const obj: Record<string, any> = {
  bar: {
    quux: 123,
  },
  foo: 'value',
  falsy: 0,
  empty: '',
  nope: false,
};

test('getSafe with string returns value', () => {
  const value = getSafe(obj, 'foo');
  expect(value).toBe('value');
});

test('getSafe with array returns nested value', () => {
  const value = getSafe(obj, ['bar', 'quux']);
  expect(value).toBe(123);
});

test('getSafe returns undefined for missing key', () => {
  const value = getSafe(obj, 'doesNotExist');
  expect(value).toBeUndefined();
});

test('getSafe returns undefined for missing nested key', () => {
  const value = getSafe(obj, ['bar', 'nah']);
  expect(value).toBeUndefined();
});

test('getSafe preserves falsy values', () => {
  expect(getSafe(obj, 'falsy')).toBe(0);
  expect(getSafe(obj, 'empty')).toBe('');
  expect(getSafe(obj, 'nope')).toBe(false);
});
