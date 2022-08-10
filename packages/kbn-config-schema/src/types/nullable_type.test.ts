/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

test('returns string value when passed string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate('test')).toBe('test');
});

test('returns number value when passed number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(42)).toBe(42);
});

test('returns boolean value when passed boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(true)).toBe(true);
});

test('returns object value when passed object', () => {
  const type = schema.nullable(
    schema.object({
      foo: schema.number(),
      bar: schema.boolean(),
      baz: schema.string(),
    })
  );
  const object = {
    foo: 666,
    bar: true,
    baz: 'foo bar baz',
  };

  expect(type.validate(object)).toEqual(object);
});

test('returns null if null for string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(null)).toBe(null);
});

test('returns null if null for number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(null)).toBe(null);
});

test('returns null if null for boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(null)).toBe(null);
});

test('returns null if undefined for string', () => {
  const type = schema.nullable(schema.string());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null if undefined for number', () => {
  const type = schema.nullable(schema.number());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null if undefined for boolean', () => {
  const type = schema.nullable(schema.boolean());
  expect(type.validate(undefined)).toBe(null);
});

test('returns null even if contained type has a default value', () => {
  const type = schema.nullable(
    schema.string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toBe(null);
});

test('validates contained type', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo')).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: value has length [3] but it must have a maximum length of [1].
- [1]: expected value to equal [null]"
`);
});

test('validates basic type', () => {
  const type = schema.nullable(schema.string());

  expect(() => type.validate(666)).toThrowErrorMatchingInlineSnapshot(`
"types that failed validation:
- [0]: expected value of type [string] but got [number]
- [1]: expected value to equal [null]"
`);
});

test('validates type in object', () => {
  const type = schema.object({
    foo: schema.nullable(schema.string({ maxLength: 1 })),
    bar: schema.nullable(schema.boolean()),
  });

  expect(type.validate({ foo: 'a' })).toEqual({ foo: 'a', bar: null });
  expect(type.validate({ foo: null })).toEqual({ foo: null, bar: null });
  expect(type.validate({})).toEqual({ foo: null, bar: null });
  expect(type.validate({ bar: null })).toEqual({ foo: null, bar: null });
});

test('validates type errors in object', () => {
  const type = schema.object({
    foo: schema.nullable(schema.string({ maxLength: 1 })),
    bar: schema.nullable(schema.boolean()),
  });

  expect(() => type.validate({ foo: 'ab' })).toThrowErrorMatchingInlineSnapshot(`
"[foo]: types that failed validation:
- [foo.0]: value has length [2] but it must have a maximum length of [1].
- [foo.1]: expected value to equal [null]"
`);
});

test('includes namespace in failure', () => {
  const type = schema.nullable(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo', {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`
"[foo-namespace]: types that failed validation:
- [foo-namespace.0]: value has length [3] but it must have a maximum length of [1].
- [foo-namespace.1]: expected value to equal [null]"
`);
});
