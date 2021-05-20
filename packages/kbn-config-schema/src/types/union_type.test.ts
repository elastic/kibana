/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '..';

test('handles string', () => {
  expect(schema.oneOf([schema.string()]).validate('test')).toBe('test');
});

test('handles string with default', () => {
  const type = schema.oneOf([schema.string()], {
    defaultValue: 'test',
  });

  expect(type.validate(undefined)).toBe('test');
});

test('handles number', () => {
  expect(schema.oneOf([schema.number()]).validate(123)).toBe(123);
});

test('handles number with default', () => {
  const type = schema.oneOf([schema.number()], {
    defaultValue: 123,
  });

  expect(type.validate(undefined)).toBe(123);
});

test('handles literal', () => {
  const type = schema.oneOf([schema.literal('foo')]);

  expect(type.validate('foo')).toBe('foo');
});

test('handles literal with default', () => {
  const type = schema.oneOf([schema.literal('foo')], {
    defaultValue: 'foo',
  });

  expect(type.validate(undefined)).toBe('foo');
});

test('handles multiple literals with default', () => {
  const type = schema.oneOf([schema.literal('foo'), schema.literal('bar')], {
    defaultValue: 'bar',
  });

  expect(type.validate('foo')).toBe('foo');
  expect(type.validate(undefined)).toBe('bar');
});

test('handles object', () => {
  const type = schema.oneOf([schema.object({ name: schema.string() })]);

  expect(type.validate({ name: 'foo' })).toEqual({ name: 'foo' });
});

test('handles object with wrong type', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() }), schema.string()]);

  expect(() => type.validate({ age: 'foo' })).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0.age]: expected value of type [number] but got [string]
    - [1]: expected value of type [string] but got [Object]"
  `);
});

test('use shorter error messages when defining only one type', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() })]);

  expect(() => type.validate({ age: 'foo' })).toThrowErrorMatchingInlineSnapshot(
    `"[age]: expected value of type [number] but got [string]"`
  );
});

test('includes namespace in failure', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() }), schema.string()]);

  expect(() => type.validate({ age: 'foo' }, {}, 'foo-namespace'))
    .toThrowErrorMatchingInlineSnapshot(`
    "[foo-namespace]: types that failed validation:
    - [foo-namespace.0.age]: expected value of type [number] but got [string]
    - [foo-namespace.1]: expected value of type [string] but got [Object]"
  `);
});

test('includes namespace in failure in shorthand mode', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() })]);

  expect(() =>
    type.validate({ age: 'foo' }, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.age]: expected value of type [number] but got [string]"`
  );
});

test('handles multiple objects with same key', () => {
  const type = schema.oneOf([
    schema.object({ age: schema.string() }),
    schema.object({ age: schema.number() }),
  ]);

  expect(type.validate({ age: 'foo' })).toEqual({ age: 'foo' });
});

test('handles multiple types', () => {
  const type = schema.oneOf([schema.string(), schema.number()]);

  expect(type.validate('test')).toBe('test');
  expect(type.validate(123)).toBe(123);
});

test('handles maybe', () => {
  const type = schema.maybe(schema.oneOf([schema.maybe(schema.string())]));

  expect(type.validate(undefined)).toBe(undefined);
  expect(type.validate('test')).toBe('test');
});

test('fails if not matching type', () => {
  const type = schema.oneOf([schema.string()]);

  expect(() => type.validate(false)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [boolean]"`
  );
  expect(() => type.validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]"`
  );
});

test('fails if not matching multiple types', () => {
  const type = schema.oneOf([schema.string(), schema.number()]);

  expect(() => type.validate(false)).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [boolean]
    - [1]: expected value of type [number] but got [boolean]"
  `);
});

test('fails if not matching literal', () => {
  const type = schema.oneOf([schema.literal('foo'), schema.literal('dolly')]);

  expect(() => type.validate('bar')).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value to equal [foo]
    - [1]: expected value to equal [dolly]"
  `);
});

test('fails if nested union type fail', () => {
  const type = schema.oneOf([
    schema.oneOf([schema.boolean()]),
    schema.oneOf([schema.oneOf([schema.object({}), schema.number()])]),
  ]);

  expect(() => type.validate('aaa')).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [boolean] but got [string]
    - [1]: types that failed validation:
     - [0]: could not parse object value from json input
     - [1]: expected value of type [number] but got [string]"
  `);
});
