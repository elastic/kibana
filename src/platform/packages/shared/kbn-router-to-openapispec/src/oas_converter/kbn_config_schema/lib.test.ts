/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import {
  is,
  convert,
  convertPathParameters,
  convertQuery,
  isNullableObjectType,
  getParamSchema,
} from './lib';

import { createLargeSchema } from './lib.test.util';

describe('convert', () => {
  test('base case', () => {
    expect(convert(createLargeSchema())).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          any: {},
          booleanDefault: {
            default: true,
            description: 'defaults to to true',
            type: 'boolean',
          },
          ipType: {
            format: 'ipv4',
            type: 'string',
          },
          literalType: {
            enum: ['literallythis'],
            type: 'string',
          },
          map: {
            additionalProperties: {
              type: 'string',
            },
            type: 'object',
          },
          maybeNumber: {
            maximum: 1000,
            minimum: 1,
            type: 'number',
          },
          record: {
            additionalProperties: {
              type: 'string',
            },
            type: 'object',
          },
          string: {
            maxLength: 10,
            minLength: 1,
            type: 'string',
          },
          union: {
            anyOf: [
              {
                description: 'Union string',
                maxLength: 1,
                type: 'string',
              },
              {
                description: 'Union number',
                minimum: 0,
                type: 'number',
              },
            ],
          },
          uri: {
            default: 'prototest://something',
            format: 'uri',
            type: 'string',
          },
        },
        required: ['string', 'ipType', 'literalType', 'map', 'record', 'union', 'any'],
        type: 'object',
      },
      shared: {},
    });
  });

  test('shared schemas', () => {
    const idSchema = schema.object({ a: schema.string() }, { meta: { id: 'myId' } });
    const otherSchema = schema.object({ id: idSchema });
    expect(convert(otherSchema)).toEqual({
      schema: {
        additionalProperties: false,
        properties: {
          id: {
            $ref: '#/components/schemas/myId',
          },
        },
        required: ['id'],
        type: 'object',
      },
      shared: {
        myId: {
          additionalProperties: false,
          properties: {
            a: {
              type: 'string',
            },
          },
          required: ['a'],
          type: 'object',
        },
      },
    });
  });
});

describe('convertPathParameters', () => {
  test('base conversion', () => {
    expect(
      convertPathParameters(schema.object({ a: schema.string() }), { a: { optional: false } })
    ).toEqual({
      params: [
        {
          in: 'path',
          name: 'a',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });
  test('conversion with refs is disallowed', () => {
    const sharedSchema = schema.object({ a: schema.string() }, { meta: { id: 'myparams' } });
    expect(() => convertPathParameters(sharedSchema, { a: { optional: false } })).toThrow(
      /myparams.*not supported/
    );
  });
  test('throws if known parameters not found', () => {
    expect(() =>
      convertPathParameters(schema.object({ b: schema.string() }), { a: { optional: false } })
    ).toThrow(/Unknown parameter: b/);
  });

  test('converting paths with nullables', () => {
    expect(
      convertPathParameters(schema.nullable(schema.object({ a: schema.string() })), {
        a: { optional: true },
      })
    ).toEqual({
      params: [
        {
          in: 'path',
          name: 'a',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('throws if properties cannot be exracted', () => {
    expect(() => convertPathParameters(schema.string(), {})).toThrow(/expected to be an object/);
  });
});

describe('convertQuery', () => {
  test('base conversion', () => {
    expect(convertQuery(schema.object({ a: schema.string() }))).toEqual({
      query: [
        {
          in: 'query',
          name: 'a',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('converting queries with nullables', () => {
    expect(convertQuery(schema.nullable(schema.object({ a: schema.string() })))).toEqual({
      query: [
        {
          in: 'query',
          name: 'a',
          required: false,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('conversion with refs is disallowed', () => {
    const sharedSchema = schema.object({ a: schema.string() }, { meta: { id: 'myparams' } });
    expect(() => convertQuery(sharedSchema)).toThrow(/myparams.*not supported/);
  });

  test('throws if properties cannot be exracted', () => {
    expect(() => convertPathParameters(schema.string(), {})).toThrow(/expected to be an object/);
  });
});

describe('is', () => {
  test.each([
    [{}, false],
    [1, false],
    [undefined, false],
    [null, false],
    [schema.any(), false], // ignore any
    [schema.object({}, { defaultValue: {}, unknowns: 'allow' }), false], // ignore any
    [schema.never(), false],
    [schema.string(), true],
    [schema.number(), true],
    [schema.mapOf(schema.string(), schema.number()), true],
    [schema.recordOf(schema.string(), schema.number()), true],
    [schema.arrayOf(schema.string()), true],
    [schema.object({}), true],
    [schema.oneOf([schema.string(), schema.number()]), true],
    [schema.maybe(schema.literal('yes')), true],
  ])('"is" correctly identifies %#', (value, result) => {
    expect(is(value)).toBe(result);
  });
});

test('isNullableObjectType', () => {
  const any = schema.any({});
  expect(isNullableObjectType(any.getSchema().describe())).toBe(false);

  const nullableAny = schema.nullable(any);
  expect(isNullableObjectType(nullableAny.getSchema().describe())).toBe(false);

  const nullableObject = schema.nullable(schema.object({}));
  expect(isNullableObjectType(nullableObject.getSchema().describe())).toBe(true);
});

test('getParamSchema from {pathVar*}', () => {
  const a = { optional: true };
  const b = { optional: true };
  const c = { optional: true };
  const keyName = 'pathVar';
  // Special * syntax in API defs
  expect(getParamSchema({ a, b, [`${keyName}*`]: c }, keyName)).toBe(c);
  // Special * syntax with ? in API defs
  expect(getParamSchema({ a, b, [`${keyName}?*`]: c }, keyName)).toBe(c);
});
