/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from './get';

const obj = {
  bar: {
    quux: 123,
  },
  'dotted.value': 'dots',
  foo: 'value',
};

test('get with string', () => {
  const value = get(obj, 'foo');
  expect(value).toBe('value');
});

test('get with array', () => {
  const value = get(obj, ['bar', 'quux']);
  expect(value).toBe(123);
});

test('throws if dot in string', () => {
  expect(() => {
    get(obj, 'dotted.value');
  }).toThrowErrorMatchingSnapshot();
});

test('does not throw if dot in array', () => {
  const value = get(obj, ['dotted.value']);
  expect(value).toBe('dots');
});
