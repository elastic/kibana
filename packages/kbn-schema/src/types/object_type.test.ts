/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { expectType } from 'tsd';
import { schema } from '../..';
import { TypeOf } from './object_type';

test('returns value by default', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {
    name: 'test',
  };

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('properly parse the value if input is a string', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = { name: 'test' };

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails with correct type if parsed input is not an object', () => {
  const type = schema.object({
    name: schema.string(),
  });
  expect(() => type.validate([1, 2, 3])).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [object] but got [Array]"`
  );
});

test('fails if missing required value', () => {
  const type = schema.object({
    name: schema.string(),
  });
  const value = {};

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[name]: expected value of type [string] but got [undefined]"`
  );
});

test('returns value if undefined string with default', () => {
  const type = schema.object({
    name: schema.string({ defaultValue: 'test' }),
  });
  const value = {};

  expect(type.validate(value)).toEqual({ name: 'test' });
});

test('fails if key does not exist in schema', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    bar: 'baz',
    foo: 'bar',
  };

  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"definition for [bar] key is missing"`
  );
});

test('defined object within object', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string({ defaultValue: 'hello world' }),
    }),
  });

  expect(type.validate({ foo: {} })).toEqual({
    foo: {
      bar: 'hello world',
    },
  });
});

test('object within object with key without defaultValue', () => {
  const type = schema.object({
    foo: schema.object({
      bar: schema.string(),
    }),
  });
  const value = { foo: {} };

  expect(() => type.validate(undefined)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [object] but got [undefined]"`
  );
  expect(() => type.validate(value)).toThrowErrorMatchingInlineSnapshot(
    `"[foo.bar]: expected value of type [string] but got [undefined]"`
  );
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    const mockValidate = jest.fn();

    const type = schema.object(
      {
        foo: schema.object({
          bar: schema.string({ defaultValue: 'baz' }),
        }),
      },
      {
        validate: mockValidate,
      }
    );

    type.validate({ foo: {} });

    expect(mockValidate).toHaveBeenCalledWith({
      foo: {
        bar: 'baz',
      },
    });
  });
});

test('called with wrong type', () => {
  const type = schema.object({});

  expect(() => type.validate('foo')).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [object] but got [string]"`
  );
  expect(() => type.validate(123)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [object] but got [number]"`
  );
});

test('handles oneOf', () => {
  const type = schema.object({
    key: schema.oneOf([schema.string(), schema.arrayOf(schema.string())]),
  });

  expect(type.validate({ key: 'foo' })).toEqual({ key: 'foo' });
  expect(() => type.validate({ key: 123 })).toThrowErrorMatchingInlineSnapshot(`
    "[key]: types that failed validation:
    - [key.0]: expected value of type [string] but got [number]
    - [key.1]: expected value of type [array] but got [number]"
  `);
});

test('includes namespace in failure when wrong top-level type', () => {
  const type = schema.object({
    foo: schema.string(),
  });

  expect(() => type.validate([], 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [object] but got [Array]"`
  );
});

test('includes namespace in failure when wrong value type', () => {
  const type = schema.object({
    foo: schema.string(),
  });
  const value = {
    foo: 123,
  };

  expect(() => type.validate(value, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace.foo]: expected value of type [string] but got [number]"`
  );
});

test('individual keys can validated', () => {
  const type = schema.object({
    foo: schema.boolean(),
  });

  const value = false;
  expect(() => type.validateKey('foo', value)).not.toThrowError();
  expect(() => type.validateKey('bar', '')).toThrowErrorMatchingInlineSnapshot(
    `"bar is not a valid part of this schema"`
  );
});

test('allow unknown keys when unknowns = `allow`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'allow' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
    bar: 'baz',
  });
});

test('unknowns = `allow` affects only own keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'allow' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo]: definition for [baz] key is missing"`);
});

test('does not allow unknown keys when unknowns = `forbid`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'forbid' }
  );
  expect(() =>
    type.validate({
      bar: 'baz',
    })
  ).toThrowErrorMatchingInlineSnapshot(`"definition for [bar] key is missing"`);
});

test('allow and remove unknown keys when unknowns = `ignore`', () => {
  const type = schema.object(
    { foo: schema.string({ defaultValue: 'test' }) },
    { unknowns: 'ignore' }
  );

  expect(
    type.validate({
      bar: 'baz',
    })
  ).toEqual({
    foo: 'test',
  });
});

test('unknowns = `ignore` affects only own keys', () => {
  const type = schema.object(
    { foo: schema.object({ bar: schema.string() }) },
    { unknowns: 'ignore' }
  );

  expect(() =>
    type.validate({
      foo: {
        bar: 'bar',
        baz: 'baz',
      },
    })
  ).toThrowErrorMatchingInlineSnapshot(`"[foo]: definition for [baz] key is missing"`);
});

test('handles optional properties', () => {
  const type = schema.object({
    required: schema.string(),
    optional: schema.maybe(schema.string()),
  });

  type SchemaType = TypeOf<typeof type>;

  expectType<SchemaType>({
    required: 'foo',
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: undefined,
  });
  expectType<SchemaType>({
    required: 'hello',
    optional: 'bar',
  });
});
