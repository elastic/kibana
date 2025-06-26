/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '../..';

test('required by default', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.contextRef('context_value_2'),
    schema.string(),
    schema.string()
  );

  expect(() =>
    type.validate(undefined, {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toThrowErrorMatchingInlineSnapshot(`"expected value of type [string] but got [undefined]"`);
});

test('returns default', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.contextRef('context_value_2'),
    schema.string(),
    schema.string(),
    {
      defaultValue: 'unknown',
    }
  );

  expect(
    type.validate(undefined, {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toEqual('unknown');
});

test('properly handles nested types with defaults', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.contextRef('context_value_2'),
    schema.string({ defaultValue: 'equal' }),
    schema.string({ defaultValue: 'not equal' })
  );

  expect(
    type.validate(undefined, {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toEqual('equal');

  expect(
    type.validate(undefined, {
      context_value_1: 0,
      context_value_2: 1,
    })
  ).toEqual('not equal');
});

test('properly validates types according chosen schema', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.contextRef('context_value_2'),
    schema.string({ minLength: 2 }),
    schema.string({ maxLength: 1 })
  );

  expect(() =>
    type.validate('a', {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [1] but it must have a minimum length of [2]."`
  );

  expect(
    type.validate('ab', {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toEqual('ab');

  expect(() =>
    type.validate('ab', {
      context_value_1: 0,
      context_value_2: 1,
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [2] but it must have a maximum length of [1]."`
  );

  expect(
    type.validate('a', {
      context_value_1: 0,
      context_value_2: 1,
    })
  ).toEqual('a');
});

test('properly validates when compares with Schema', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.number(),
    schema.string({ minLength: 2 }),
    schema.string({ minLength: 3 })
  );

  expect(() =>
    type.validate('a', {
      context_value_1: 0,
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [1] but it must have a minimum length of [2]."`
  );

  expect(
    type.validate('ab', {
      context_value_1: 0,
    })
  ).toEqual('ab');

  expect(() =>
    type.validate('ab', {
      context_value_1: 'b',
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [2] but it must have a minimum length of [3]."`
  );

  expect(
    type.validate('abc', {
      context_value_1: 'b',
    })
  ).toEqual('abc');
});

test('properly validates when compares with "null" literal Schema', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.literal(null),
    schema.string({ minLength: 2 }),
    schema.string({ minLength: 3 })
  );

  expect(() =>
    type.validate('a', {
      context_value_1: null,
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [1] but it must have a minimum length of [2]."`
  );

  expect(
    type.validate('ab', {
      context_value_1: null,
    })
  ).toEqual('ab');

  expect(() =>
    type.validate('ab', {
      context_value_1: 'b',
    })
  ).toThrowErrorMatchingInlineSnapshot(
    `"value has length [2] but it must have a minimum length of [3]."`
  );

  expect(
    type.validate('abc', {
      context_value_1: 'b',
    })
  ).toEqual('abc');
});

test('properly handles schemas with incompatible types', () => {
  const type = schema.conditional(
    schema.contextRef('context_value_1'),
    schema.contextRef('context_value_2'),
    schema.string(),
    schema.boolean()
  );

  expect(() =>
    type.validate(true, {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toThrowErrorMatchingInlineSnapshot(`"expected value of type [string] but got [boolean]"`);

  expect(
    type.validate('a', {
      context_value_1: 0,
      context_value_2: 0,
    })
  ).toEqual('a');

  expect(() =>
    type.validate('a', {
      context_value_1: 0,
      context_value_2: 1,
    })
  ).toThrowErrorMatchingInlineSnapshot(`"expected value of type [boolean] but got [string]"`);

  expect(
    type.validate(true, {
      context_value_1: 0,
      context_value_2: 1,
    })
  ).toEqual(true);
});

test('properly handles conditionals within objects', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.conditional(schema.siblingRef('key'), 'number', schema.number(), schema.string()),
  });

  expect(() => type.validate({ key: 'string', value: 1 })).toThrowErrorMatchingInlineSnapshot(
    `"[value]: expected value of type [string] but got [number]"`
  );

  expect(type.validate({ key: 'string', value: 'a' })).toEqual({
    key: 'string',
    value: 'a',
  });

  expect(() => type.validate({ key: 'number', value: 'a' })).toThrowErrorMatchingInlineSnapshot(
    `"[value]: expected value of type [number] but got [string]"`
  );

  expect(type.validate({ key: 'number', value: 1 })).toEqual({
    key: 'number',
    value: 1,
  });
});

test('properly handled within `maybe`', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.maybe(
      schema.conditional(schema.siblingRef('key'), 'number', schema.number(), schema.string())
    ),
  });

  expect(type.validate({ key: 'string' })).toEqual({
    key: 'string',
  });

  expect(type.validate({ key: 'number', value: 1 })).toEqual({
    key: 'number',
    value: 1,
  });
});

test('works with both context and sibling references', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.conditional(
      schema.siblingRef('key'),
      schema.contextRef('context_key'),
      schema.number(),
      schema.string()
    ),
  });

  expect(() =>
    type.validate({ key: 'string', value: 1 }, { context_key: 'number' })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[value]: expected value of type [string] but got [number]"`
  );

  expect(type.validate({ key: 'string', value: 'a' }, { context_key: 'number' })).toEqual({
    key: 'string',
    value: 'a',
  });

  expect(() =>
    type.validate({ key: 'number', value: 'a' }, { context_key: 'number' })
  ).toThrowErrorMatchingInlineSnapshot(
    `"[value]: expected value of type [number] but got [string]"`
  );

  expect(type.validate({ key: 'number', value: 1 }, { context_key: 'number' })).toEqual({
    key: 'number',
    value: 1,
  });
});

test('includes namespace into failures', () => {
  const type = schema.object({
    key: schema.string(),
    value: schema.conditional(schema.siblingRef('key'), 'number', schema.number(), schema.string()),
  });

  expect(() =>
    type.validate({ key: 'string', value: 1 }, {}, 'mega-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[mega-namespace.value]: expected value of type [string] but got [number]"`
  );

  expect(() =>
    type.validate({ key: 'number', value: 'a' }, {}, 'mega-namespace')
  ).toThrowErrorMatchingInlineSnapshot(
    `"[mega-namespace.value]: expected value of type [number] but got [string]"`
  );
});

test('correctly handles missing references', () => {
  const type = schema.object({
    value: schema.conditional(
      schema.siblingRef('missing-key'),
      'number',
      schema.number(),
      schema.string()
    ),
  });

  expect(() => type.validate({ value: 1 })).toThrowErrorMatchingInlineSnapshot(
    `"[value]: expected value of type [string] but got [number]"`
  );

  expect(type.validate({ value: 'a' })).toEqual({ value: 'a' });
});

test('works within `oneOf`', () => {
  const type = schema.oneOf([
    schema.conditional(schema.contextRef('type'), 'number', schema.number(), schema.string()),
    schema.conditional(
      schema.contextRef('type'),
      'boolean',
      schema.boolean(),
      schema.arrayOf(schema.string())
    ),
  ]);

  expect(type.validate(1, { type: 'number' })).toEqual(1);
  expect(type.validate('1', { type: 'string' })).toEqual('1');
  expect(type.validate(true, { type: 'boolean' })).toEqual(true);
  expect(type.validate(['a', 'b'], { type: 'array' })).toEqual(['a', 'b']);

  expect(() => type.validate(1, { type: 'string' })).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [number]
    - [1]: expected value of type [array] but got [number]"
  `);
  expect(() => type.validate(true, { type: 'string' })).toThrowErrorMatchingInlineSnapshot(`
    "types that failed validation:
    - [0]: expected value of type [string] but got [boolean]
    - [1]: expected value of type [array] but got [boolean]"
  `);
});

describe('#validate', () => {
  test('is called after all content is processed', () => {
    const mockValidate = jest.fn();

    const type = schema.object(
      {
        key: schema.string(),
        value: schema.conditional(
          schema.siblingRef('key'),
          'number',
          schema.number({ defaultValue: 100 }),
          schema.string({ defaultValue: 'some-string' })
        ),
      },
      {
        validate: mockValidate,
      }
    );

    type.validate({ key: 'number' });

    expect(mockValidate).toHaveBeenCalledWith({
      key: 'number',
      value: 100,
    });

    mockValidate.mockClear();

    type.validate({ key: 'not-number' });

    expect(mockValidate).toHaveBeenCalledWith({
      key: 'not-number',
      value: 'some-string',
    });
  });
});

describe('#extendsDeep', () => {
  describe('#equalType', () => {
    const type = schema.object({
      foo: schema.string(),
      test: schema.conditional(
        schema.siblingRef('foo'),
        'test',
        schema.object({
          bar: schema.string(),
        }),
        schema.string()
      ),
    });

    test('objects with unknown attributes are kept when extending with unknowns=allow', () => {
      const result = type
        .extendsDeep({ unknowns: 'allow' })
        .validate({ foo: 'test', test: { bar: 'test', baz: 'test' } });
      expect(result).toEqual({
        foo: 'test',
        test: { bar: 'test', baz: 'test' },
      });
    });

    test('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
      const result = type
        .extendsDeep({ unknowns: 'ignore' })
        .validate({ foo: 'test', test: { bar: 'test', baz: 'test' } });
      expect(result).toEqual({
        foo: 'test',
        test: { bar: 'test' },
      });
    });
    test('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
      expect(() =>
        type
          .extendsDeep({ unknowns: 'forbid' })
          .validate({ foo: 'test', test: { bar: 'test', baz: 'test' } })
      ).toThrowErrorMatchingInlineSnapshot(`"[test.baz]: definition for this key is missing"`);
    });
  });

  describe('#notEqualType', () => {
    const type = schema.object({
      foo: schema.string(),
      test: schema.conditional(
        schema.siblingRef('foo'),
        'test',
        schema.string(),
        schema.object({
          bar: schema.string(),
        })
      ),
    });

    test('objects with unknown attributes are kept when extending with unknowns=allow', () => {
      const allowSchema = type.extendsDeep({ unknowns: 'allow' });
      const result = allowSchema.validate({ foo: 'not-test', test: { bar: 'test', baz: 'test' } });
      expect(result).toEqual({
        foo: 'not-test',
        test: { bar: 'test', baz: 'test' },
      });
    });

    test('objects with unknown attributes are dropped when extending with unknowns=ignore', () => {
      const ignoreSchema = type.extendsDeep({ unknowns: 'ignore' });
      const result = ignoreSchema.validate({ foo: 'not-test', test: { bar: 'test', baz: 'test' } });
      expect(result).toEqual({
        foo: 'not-test',
        test: { bar: 'test' },
      });
    });
    test('objects with unknown attributes fail validation when extending with unknowns=forbid', () => {
      const forbidSchema = type.extendsDeep({ unknowns: 'forbid' });
      expect(() =>
        forbidSchema.validate({ foo: 'not-test', test: { bar: 'test', baz: 'test' } })
      ).toThrowErrorMatchingInlineSnapshot(`"[test.baz]: definition for this key is missing"`);
    });
  });
});
