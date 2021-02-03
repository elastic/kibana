/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { schema } from '..';

test('returns value if specified', () => {
  const type = schema.maybe(schema.string());
  expect(type.validate('test')).toEqual('test');
});

test('returns undefined if undefined', () => {
  const type = schema.maybe(schema.string());
  expect(type.validate(undefined)).toEqual(undefined);
});

test('returns undefined even if contained type has a default value', () => {
  const type = schema.maybe(
    schema.string({
      defaultValue: 'abc',
    })
  );

  expect(type.validate(undefined)).toEqual(undefined);
});

test('validates contained type', () => {
  const type = schema.maybe(schema.string({ maxLength: 1 }));

  expect(() => type.validate('foo')).toThrowErrorMatchingInlineSnapshot(
    `"value has length [3] but it must have a maximum length of [1]."`
  );
});

test('validates basic type', () => {
  const type = schema.maybe(schema.string());

  expect(() => type.validate(666)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [number]"`
  );
});

test('fails if null', () => {
  const type = schema.maybe(schema.string());
  expect(() => type.validate(null)).toThrowErrorMatchingInlineSnapshot(
    `"expected value of type [string] but got [null]"`
  );
});

test('includes namespace in failure', () => {
  const type = schema.maybe(schema.string());
  expect(() => type.validate(null, {}, 'foo-namespace')).toThrowErrorMatchingInlineSnapshot(
    `"[foo-namespace]: expected value of type [string] but got [null]"`
  );
});

describe('maybe + object', () => {
  test('returns undefined if undefined object', () => {
    const type = schema.maybe(schema.object({}));
    expect(type.validate(undefined)).toEqual(undefined);
  });

  test('returns undefined if undefined object with no defaults', () => {
    const type = schema.maybe(
      schema.object({
        type: schema.string(),
        id: schema.string(),
      })
    );

    expect(type.validate(undefined)).toEqual(undefined);
  });

  test('returns empty object if maybe keys', () => {
    const type = schema.object({
      name: schema.maybe(schema.string()),
    });
    expect(type.validate({})).toEqual({});
  });

  test('returns empty object if maybe nested object', () => {
    const type = schema.object({
      name: schema.maybe(
        schema.object({
          type: schema.string(),
          id: schema.string(),
        })
      ),
    });

    expect(type.validate({})).toEqual({});
  });
});
