/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';
import { META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES } from '../oas_meta_fields';

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

describe('#extendsDeep', () => {
  const type = schema.recordOf(schema.string(), schema.object({ foo: schema.string() }));

  test('objects with unknown attributes are kept when extending with unknowns=allow', () => {
    const allowSchema = type.extendsDeep({ unknowns: 'allow' });
    const result = allowSchema.validate({ key: { foo: 'test', bar: 'test' } });
    expect(result).toEqual({ key: { foo: 'test', bar: 'test' } });
  });

  test('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
    const ignoreSchema = type.extendsDeep({ unknowns: 'ignore' });
    const result = ignoreSchema.validate({ key: { foo: 'test', bar: 'test' } });
    expect(result).toEqual({ key: { foo: 'test' } });
  });

  test('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
    const forbidSchema = type.extendsDeep({ unknowns: 'forbid' });
    expect(() =>
      forbidSchema.validate({ key: { foo: 'test', bar: 'test' } })
    ).toThrowErrorMatchingInlineSnapshot(`"[key.bar]: definition for this key is missing"`);
  });
});

describe('nested unknowns', () => {
  // we don't allow strip unknowns in oneOf for now because joi
  // doesn't allow it in joi.alternatives and we use that for oneOf
  test('cant strip unknown keys in oneOf so it should throw an error', () => {
    const type = schema.recordOf(
      schema.oneOf([schema.literal('a'), schema.literal('b')]),
      schema.string()
    );

    expect(() =>
      type.validate(
        {
          a: 'abc',
          x: 'def',
        },
        void 0,
        void 0,
        { stripUnknownKeys: true }
      )
    ).toThrowErrorMatchingInlineSnapshot(`
      "[key(\\"x\\")]: types that failed validation:
      - [0]: expected value to equal [a]
      - [1]: expected value to equal [b]"
    `);
  });

  test('should strip unknown nested keys if stripUnkownKeys is true in validate', () => {
    const type = schema.recordOf(
      schema.string(),
      schema.object({
        a: schema.string(),
      })
    );

    expect(
      type.validate(
        {
          x: {
            a: '123',
            b: 'should be stripped',
          },
        },
        void 0,
        void 0,
        { stripUnknownKeys: true }
      )
    ).toStrictEqual({
      x: {
        a: '123',
      },
    });
  });

  test('should strip unknown nested keys if unknowns is ignore in the schema', () => {
    const type = schema.recordOf(
      schema.string(),
      schema.object({
        a: schema.string(),
      }),
      { unknowns: 'ignore' }
    );

    expect(
      type.validate(
        {
          x: {
            a: '123',
            b: 'should be stripped',
          },
        },
        void 0,
        void 0,
        {}
      )
    ).toStrictEqual({
      x: {
        a: '123',
      },
    });
  });

  test('should strip unknown keys in object inside map inside record when stripUnkownKeys is true', () => {
    const type = schema.recordOf(
      schema.string(),
      schema.mapOf(
        schema.string(),
        schema.object({
          a: schema.string(),
        })
      )
    );

    const value = {
      record1: new Map([
        ['key1', { a: '123', b: 'should be stripped' }],
        ['key2', { a: '456', extra: 'remove this' }],
      ]),
    };

    const expected = {
      record1: new Map([
        ['key1', { a: '123' }],
        ['key2', { a: '456' }],
      ]),
    };

    expect(type.validate(value, void 0, void 0, { stripUnknownKeys: true })).toStrictEqual(
      expected
    );
  });

  test('should strip unknown keys in object inside map inside record when unkowns is ignore', () => {
    const type = schema.recordOf(
      schema.string(),
      schema.mapOf(
        schema.string(),
        schema.object({
          a: schema.string(),
        })
      ),
      { unknowns: 'ignore' }
    );

    const value = {
      record1: new Map([
        ['key1', { a: '123', b: 'should be stripped' }],
        ['key2', { a: '456', extra: 'remove this' }],
      ]),
    };

    const expected = {
      record1: new Map([
        ['key1', { a: '123' }],
        ['key2', { a: '456' }],
      ]),
    };

    expect(type.validate(value, void 0, void 0, {})).toStrictEqual(expected);
  });
});

test('meta', () => {
  const stringSchema = schema.string();
  const type = schema.mapOf(schema.string(), stringSchema);
  const result = type
    .getSchema()
    .describe()
    .metas![0][META_FIELD_X_OAS_GET_ADDITIONAL_PROPERTIES]();

  expect(result).toBe(stringSchema.getSchema());
});
