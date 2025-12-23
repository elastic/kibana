/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

test('handles single object', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), age: schema.number() }),
  ]);

  expect(type.validate({ type: 'foo', age: 24 })).toEqual({ type: 'foo', age: 24 });
});

test('fails as expected with single object', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), age: schema.number() }),
  ]);

  expect(() => type.validate({ type: 'foo', age: 'foo' })).toThrowErrorMatchingInlineSnapshot(
    `"[age]: Error: expected value of type [number] but got [string]"`
  );
});

test('handles multiple objects', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(type.validate({ type: 'foo', foo: 'test' })).toEqual({ type: 'foo', foo: 'test' });
});

test('handles catch-all pattern', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
    schema.object({ type: schema.string(), bar: schema.literal('catch all!') }),
  ]);

  expect(type.validate({ type: 'whathaveyou', bar: 'catch all!' })).toEqual({
    type: 'whathaveyou',
    bar: 'catch all!',
  });
});

test('fails with less helpful error message when multiple catch-all patterns are provided', () => {
  // Schema authors should avoid this antipattern
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
    schema.object({ type: schema.string(), bar: schema.literal('catch all!') }),
    schema.object({ type: schema.string(), bar: schema.literal('catch all again!') }),
  ]);

  expect(() => type.validate({ type: 123, bar: 'catch all!' })).toThrowErrorMatchingInlineSnapshot(
    `"value [123] did not match any of the allowed values for [type]: [Error: expected value to equal [foo], Error: expected value to equal [bar], Error: expected value of type [string] but got [number], Error: expected value of type [string] but got [number]]"`
  );
});

test('fails with less helpful error message when multiple discriminators are matched', () => {
  // Schema authors should avoid this antipattern
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
    schema.object({ type: schema.string(), bar: schema.number() }),
    schema.object({ type: schema.string(), bar: schema.number() }),
  ]);

  expect(() => type.validate({ type: 'catchall', bar: 123 })).toThrowErrorMatchingInlineSnapshot(
    `"value [catchall] matched more than one allowed type of [type]"`
  );
});

test('handles multiple objects with the same type', () => {
  // This defeats the purpose of the discriminator, but it will work
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), age: schema.string() }),
    schema.object({ type: schema.literal('foo'), age: schema.number() }),
  ]);

  expect(type.validate({ type: 'foo', age: 'foo' })).toEqual({ type: 'foo', age: 'foo' });
});

test('includes namespace in failure', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), age: schema.string() }),
    schema.object({ type: schema.literal('bar'), age: schema.number() }),
  ]);

  expect(() =>
    type.validate({ type: 'foo', age: 12 }, {}, 'foo-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.age]: Error: expected value of type [string] but got [number]"`
  );
});

test('fails when no discriminator is provided', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(() => type.validate({ foo: 12 })).toThrowErrorMatchingInlineSnapshot(
    `"value [undefined] did not match any of the allowed values for [type]: [Error: expected value to equal [foo], Error: expected value to equal [bar]]"`
  );
});

test('fails when discriminator is provided, but is not any allowed value', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(() => type.validate({ type: 'foo1', foo: 12 })).toThrowErrorMatchingInlineSnapshot(
    `"value [foo1] did not match any of the allowed values for [type]: [Error: expected value to equal [foo], Error: expected value to equal [bar]]"`
  );
});

test('fails when discriminator matches but the rest of the type fails', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), foo: schema.string() }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(() => type.validate({ type: 'foo', foo: 12 })).toThrowErrorMatchingInlineSnapshot(
    `"[foo]: Error: expected value of type [string] but got [number]"`
  );
});

test('fails when discriminator matches but the rest of the type fails (nested object)', () => {
  const type = schema.discriminatedOneOf('type', [
    schema.object({ type: schema.literal('foo'), object: schema.object({ foo: schema.string() }) }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(() =>
    type.validate({ type: 'foo', object: { foo: 12 } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[object.foo]: Error: expected value of type [string] but got [number]"`
  );
});

test('fails weirdly if discriminator keys are not ordered consistently', () => {
  // Unfortunately I can't see a good way of handling this case gracefully,
  // so hopefully developers will specify their discriminator key first in the schema.
  // Alternatively, we can try to find a way to not abort validation early for discriminatedOneOf
  // types to introspect the error details better (likely a performance hit).
  const type = schema.discriminatedOneOf('type', [
    schema.object({ foo: schema.string(), type: schema.literal('foo') }),
    schema.object({ type: schema.literal('bar'), bar: schema.number() }),
  ]);

  expect(() => type.validate({ type: 'foo1', nothing: 12 })).toThrowErrorMatchingInlineSnapshot(
    `"[foo]: Error: expected value of type [string] but got [undefined]"`
  );
});

test('fails if nested discriminatedOneOf types fail due to discriminator', () => {
  const type = schema.discriminatedOneOf('discriminator1', [
    schema.object({
      discriminator1: schema.literal('foo'),
      foo: schema.discriminatedOneOf('discriminator2', [
        schema.object({ discriminator2: schema.literal('foo'), foo: schema.string() }),
        schema.object({ discriminator2: schema.literal('bar'), foo: schema.number() }),
      ]),
    }),
    schema.object({ discriminator1: schema.literal('foo'), foo: schema.number() }),
  ]);

  expect(() =>
    type.validate({ discriminator1: 'foo', foo: { discriminator2: 'baz', foo: 12 } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo]: Error: value [baz] did not match any of the allowed values for [discriminator2]: [Error: expected value to equal [foo], Error: expected value to equal [bar]]"`
  );
});

test('fails if nested discriminatedOneOf types fail', () => {
  const type = schema.discriminatedOneOf('discriminator1', [
    schema.object({
      discriminator1: schema.literal('1'),
      foo1: schema.discriminatedOneOf('discriminator2', [
        schema.object({ discriminator2: schema.literal('foo'), foo2: schema.string() }),
        schema.object({ discriminator2: schema.literal('bar'), foo2: schema.number() }),
      ]),
    }),
    schema.object({ discriminator1: schema.literal('2'), foo: schema.number() }),
  ]);

  expect(() =>
    type.validate({
      discriminator1: '1',
      foo1: { discriminator2: 'bar', foo2: 'should be a number' },
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[foo1.foo2]: Error: Error: expected value of type [number] but got [string]"`
  );
});
