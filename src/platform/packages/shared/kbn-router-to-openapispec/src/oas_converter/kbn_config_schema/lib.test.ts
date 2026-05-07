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
          any: { description: 'any type', 'x-oas-any-type': true },
          array: {
            items: {
              additionalProperties: false,
              properties: {
                foo: {
                  type: 'string',
                },
              },
              required: ['foo'],
              type: 'object',
            },
            type: 'array',
          },
          arrayWithId: {
            $ref: '#/components/schemas/myArray',
          },
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
            'x-oas-optional': true,
          },
          neverType: { not: {} },
          record: {
            additionalProperties: { type: 'string' },
            type: 'object',
          },
          string: {
            type: 'string',
            'x-oas-max-length': 10,
            'x-oas-min-length': 1,
          },
          union: {
            anyOf: [
              {
                description: 'Union string',
                type: 'string',
                'x-oas-max-length': 1,
              },
              {
                description: 'Union number',
                minimum: 0,
                type: 'number',
              },
            ],
          },
          unionWithId: {
            $ref: '#/components/schemas/myUnion',
          },
          uri: {
            default: 'prototest://something',
            format: 'uri',
            type: 'string',
          },
        },
        required: [
          'string',
          'ipType',
          'literalType',
          'neverType',
          'map',
          'record',
          'union',
          'unionWithId',
          'array',
          'arrayWithId',
          'any',
        ],
        type: 'object',
      },
      shared: {
        myArray: {
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
          },
          title: 'myArray',
          type: 'array',
        },
        myUnion: {
          anyOf: [
            {
              description: 'Union string',
              type: 'string',
              'x-oas-max-length': 1,
            },
            {
              description: 'Union number',
              minimum: 0,
              type: 'number',
            },
          ],
          title: 'myUnion',
        },
      },
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
          title: 'myId',
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
    ).toThrow(/Path expects key "a" from schema but it was not found/);
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
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('throws if properties cannot be exracted', () => {
    expect(() => convertPathParameters(schema.string(), {})).toThrow(
      /Parameters schema must be an _object_ schema validator/
    );
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

  test('collapses oneOf [scalar, array] query params to array', () => {
    expect(
      convertQuery(
        schema.object({
          status: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        })
      )
    ).toEqual({
      query: [
        {
          description: undefined,
          in: 'query',
          name: 'status',
          required: false,
          schema: {
            type: 'array',
            items: { type: 'string' },
            'x-oas-optional': true,
          },
        },
      ],
      shared: {},
    });
  });

  test('collapses oneOf [enum, array[enum]] query params preserving enum', () => {
    expect(
      convertQuery(
        schema.object({
          status: schema.maybe(
            schema.oneOf([
              schema.oneOf([schema.literal('running'), schema.literal('finished')]),
              schema.arrayOf(schema.oneOf([schema.literal('running'), schema.literal('finished')])),
            ])
          ),
        })
      )
    ).toEqual({
      query: [
        {
          in: 'query',
          name: 'status',
          required: false,
          description: undefined,
          schema: {
            anyOf: [
              {
                anyOf: [
                  { enum: ['running'], type: 'string' },
                  { enum: ['finished'], type: 'string' },
                ],
              },
              {
                type: 'array',
                items: {
                  anyOf: [
                    { enum: ['running'], type: 'string' },
                    { enum: ['finished'], type: 'string' },
                  ],
                },
              },
            ],
            'x-oas-optional': true,
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
    expect(() => convertQuery(schema.string())).toThrow(
      /Query schema must be an _object_ schema validator/
    );
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
  expect(isNullableObjectType(any.getSchema())).toBe(false);

  const nullableAny = schema.nullable(any);
  expect(isNullableObjectType(nullableAny.getSchema())).toBe(false);

  const nullableObject = schema.nullable(schema.object({}));
  expect(isNullableObjectType(nullableObject.getSchema())).toBe(true);
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
