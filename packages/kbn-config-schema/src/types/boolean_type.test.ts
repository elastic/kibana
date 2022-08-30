/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

test('returns value by default', () => {
  expect(schema.boolean().validate(true)).toBe(true);
});

test('handles boolean strings', () => {
  expect(schema.boolean().validate('true')).toBe(true);
  expect(schema.boolean().validate('TRUE')).toBe(true);
  expect(schema.boolean().validate('True')).toBe(true);
  expect(schema.boolean().validate('TrUe')).toBe(true);
  expect(schema.boolean().validate('false')).toBe(false);
  expect(schema.boolean().validate('FALSE')).toBe(false);
  expect(schema.boolean().validate('False')).toBe(false);
  expect(schema.boolean().validate('FaLse')).toBe(false);
});

test('is required by default', () => {
  expect(() => schema.boolean().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.boolean().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [boolean] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(schema.boolean({ defaultValue: true }).validate(undefined)).toBe(true);
  });

  test('returns value when specified', () => {
    expect(schema.boolean({ defaultValue: true }).validate(false)).toBe(false);
  });
});

test('returns error when not boolean', () => {
  expect(() => schema.boolean().validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [number]"`
  );

  expect(() => schema.boolean().validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [Array]"`
  );

  expect(() => schema.boolean().validate('abc')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [string]"`
  );

  expect(() => schema.boolean().validate(0)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [number]"`
  );

  expect(() => schema.boolean().validate('no')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [boolean] but got [string]"`
  );
});
