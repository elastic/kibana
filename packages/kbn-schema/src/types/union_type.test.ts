/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '../..';

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
    "expected one of:
      | { [age]: number } but got { [age]: string }
      | [string] but got [object]
    "
  `);
});

test('includes namespace in failure', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() }), schema.string()]);

  expect(() => type.validate({ age: 'foo' }, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`
    "[foo-namespace]: expected one of:
      | { [age]: number } but got { [age]: string }
      | [string] but got [object]
    "
  `);
});

test('includes namespace in failure in shorthand mode', () => {
  const type = schema.oneOf([schema.object({ age: schema.number() })]);

  expect(() => type.validate({ age: 'foo' }, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(`
    "[foo-namespace]: expected one of:
      | { [age]: number } but got { [age]: string }
    "
  `);
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

  expect(() => type.validate(false)).toThrowErrorMatchingInlineSnapshot(`
    "expected one of:
      | [string] but got [boolean]
    "
  `);
  expect(() => type.validate(123)).toThrowErrorMatchingInlineSnapshot(`
    "expected one of:
      | [string] but got [number]
    "
  `);
});

test('fails if not matching multiple types', () => {
  const type = schema.oneOf([schema.string(), schema.number()]);

  expect(() => type.validate(false)).toThrowErrorMatchingInlineSnapshot(`
    "expected one of:
      | [string] but got [boolean]
      | [number] but got [boolean]
    "
  `);
});

test('fails if not matching literal', () => {
  const type = schema.oneOf([schema.literal('foo'), schema.literal('dolly')]);

  expect(() => type.validate('bar')).toThrowErrorMatchingInlineSnapshot(`
    "expected one of:
      | [foo] but got [bar]
      | [dolly] but got [bar]
    "
  `);
});

test('fails if nested union type fail', () => {
  const type = schema.oneOf([
    schema.oneOf([schema.boolean()]),
    schema.oneOf([schema.oneOf([schema.object({ foo: schema.string() }), schema.number()])]),
  ]);

  expect(() => type.validate({ foo: 1 })).toThrowErrorMatchingInlineSnapshot(`
    "expected one of:
      | [boolean] but got [object]
      | { [foo]: string } but got { [foo]: number }
      | [number] but got [object]
    "
  `);
});
