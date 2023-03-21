/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

test('works for any value', () => {
  expect(schema.any().validate(true)).toBe(true);
  expect(schema.any().validate(100)).toBe(100);
  expect(schema.any().validate('foo')).toBe('foo');
  expect(schema.any().validate(null)).toBe(null);
  expect(schema.any().validate({ foo: 'bar', baz: 2 })).toEqual({ foo: 'bar', baz: 2 });
});

test('is required by default', () => {
  expect(() => schema.any().validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [any] but got [undefined]"`
  );
});

test('includes namespace in failure', () => {
  expect(() =>
    schema.any().validate(undefined, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [any] but got [undefined]"`
  );
});

describe('#defaultValue', () => {
  test('returns default when undefined', () => {
    expect(schema.any({ defaultValue: true }).validate(undefined)).toBe(true);
    expect(schema.any({ defaultValue: 200 }).validate(undefined)).toBe(200);
    expect(schema.any({ defaultValue: 'bar' }).validate(undefined)).toBe('bar');
    expect(schema.any({ defaultValue: { baz: 'foo' } }).validate(undefined)).toEqual({
      baz: 'foo',
    });
  });

  test('returns value when specified', () => {
    expect(schema.any({ defaultValue: true }).validate(false)).toBe(false);
    expect(schema.any({ defaultValue: 200 }).validate(100)).toBe(100);
    expect(schema.any({ defaultValue: 'bar' }).validate('foo')).toBe('foo');
    expect(schema.any({ defaultValue: 'not-null' }).validate(null)).toBe(null);
    expect(schema.any({ defaultValue: { baz: 'foo' } }).validate({ foo: 'bar', baz: 2 })).toEqual({
      foo: 'bar',
      baz: 2,
    });
  });
});
