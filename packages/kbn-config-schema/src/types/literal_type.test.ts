/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

const { literal } = schema;

test('handles string', () => {
  expect(literal('test').validate('test')).toBe('test');
});

test('handles boolean', () => {
  expect(literal(false).validate(false)).toBe(false);
});

test('handles number', () => {
  expect(literal(123).validate(123)).toBe(123);
});

test('handles null', () => {
  expect(literal(null).validate(null)).toBe(null);
});

test('returns error when not correct', () => {
  expect(() => literal('test').validate('foo')).toThrowErrorMatchingInlineSnapshot(
    `"expected value to equal [test]"`
  );

  expect(() => literal(true).validate(false)).toThrowErrorMatchingInlineSnapshot(
    `"expected value to equal [true]"`
  );

  expect(() => literal('test').validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value to equal [test]"`
  );

  expect(() => literal(123).validate('abc')).toThrowErrorMatchingInlineSnapshot(
    `"expected value to equal [123]"`
  );

  expect(() => literal(null).validate(42)).toThrowErrorMatchingInlineSnapshot(
    `"expected value to equal [null]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    literal('test').validate('foo', {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(`"[foo-namespace]: expected value to equal [test]"`);
});
