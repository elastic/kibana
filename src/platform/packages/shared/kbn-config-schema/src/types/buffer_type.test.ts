/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

test('returns value by default', () => {
  const value = Buffer.from('Hi!');
  expect(schema.buffer().validate(value)).toStrictEqual(value);
});

test('is required by default', () => {
  expect(() => schema.buffer().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Buffer] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.buffer().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [Buffer] but got [undefined]"`
  );
});

test('coerces strings to buffer', () => {
  expect(schema.buffer().validate('abc')).toStrictEqual(Buffer.from('abc'));
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    const value = Buffer.from('Hi!');
    expect(schema.buffer({ defaultValue: value }).validate(undefined)).toStrictEqual(value);
  });

  test('returns value when specified', () => {
    const value = Buffer.from('Hi!');
    expect(schema.buffer({ defaultValue: Buffer.from('Bye!') }).validate(value)).toStrictEqual(
      value
    );
  });
});

test('returns error when not a buffer', () => {
  expect(() => schema.buffer().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Buffer] but got [number]"`
  );

  expect(() => schema.buffer().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [Buffer] but got [Array]"`
  );
});
