/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '..';

test('handles object as input', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = {
    name: 'foo',
  };
  expect(type.validate(value)).toEqual({ name: 'foo' });
});

test('properly parse the value if input is a string', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = `{"name": "foo"}`;
  expect(type.validate(value)).toEqual({ name: 'foo' });
});

test('fails with correct type if parsed input is a plain object', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = `["a", "b"]`;
  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [object] but got [Array]"`
  );
});

test('fails when not receiving expected value type', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = {
    name: 123,
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [number]"`
  );
});

test('fails after parsing when not receiving expected value type', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = `{"name": 123}`;

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [number]"`
  );
});

test('fails when not receiving expected key type', () => {
  const type = schema.recordOf(
    schema.oneOf([schema.literal('nickName'), schema.literal('lastName')]),
    schema.string()
  );

  const value = {
    name: 'foo',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(`
"[key(\\"name\\")]: types that failed validation:
- [0]: expected value to equal [nickName]
- [1]: expected value to equal [lastName]"
`);
});

test('fails after parsing when not receiving expected key type', () => {
  const type = schema.recordOf(
    schema.oneOf([schema.literal('nickName'), schema.literal('lastName')]),
    schema.string()
  );

  const value = `{"name": "foo"}`;

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(`
"[key(\\"name\\")]: types that failed validation:
- [0]: expected value to equal [nickName]
- [1]: expected value to equal [lastName]"
`);
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  expect(() => type.validate([], {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [object] but got [Array]"`
  );
});

test('includes namespace in failure when wrong value type', () => {
  const type = schema.recordOf(schema.string(), schema.string());
  const value = {
    name: 123,
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.name]: expected value of type [string] but got [number]"`
  );
});

test('includes namespace in failure when wrong key type', () => {
  const type = schema.recordOf(schema.string({ minLength: 10 }), schema.string());
  const value = {
    name: 'foo',
  };

  expect(() => type.validate(value, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.key(\\"name\\")]: value has length [4] but it must have a minimum length of [10]."`
  );
});

test('returns default value if undefined', () => {
  const obj = { foo: 'bar' };

  const type = schema.recordOf(schema.string(), schema.string(), {
    defaultValue: obj,
  });

  expect(type.validate(undefined)).toEqual(obj);
});

test('recordOf within recordOf', () => {
  const type = schema.recordOf(schema.string(), schema.recordOf(schema.string(), schema.number()));
  const value = {
    foo: {
      bar: 123,
    },
  };

  expect(type.validate(value)).toEqual({ foo: { bar: 123 } });
});

test('object within recordOf', () => {
  const type = schema.recordOf(
    schema.string(),
    schema.object({
      bar: schema.number(),
    })
  );
  const value = {
    foo: {
      bar: 123,
    },
  };

  expect(type.validate(value)).toEqual({ foo: { bar: 123 } });
});

test('enforces required object fields within recordOf', () => {
  const type = schema.recordOf(
    schema.string(),
    schema.object({
      bar: schema.object({
        baz: schema.number(),
      }),
    })
  );
  const value = {
    foo: {},
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar.baz]: expected value of type [number] but got [undefined]"`
  );
});

test('error preserves full path', () => {
  const type = schema.object({
    grandParentKey: schema.object({
      parentKey: schema.recordOf(schema.string({ minLength: 2 }), schema.number()),
    }),
  });

  expect(() =>
    type.validate({ grandParentKey: { parentKey: { a: 'some-value' } } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[grandParentKey.parentKey.key(\\"a\\")]: value has length [1] but it must have a minimum length of [2]."`
  );

  expect(() =>
    type.validate({ grandParentKey: { parentKey: { ab: 'some-value' } } })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[grandParentKey.parentKey.ab]: expected value of type [number] but got [string]"`
  );
});
