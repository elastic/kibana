/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { z as z4 } from '@kbn/zod/v4';
import { BooleanFromString, PassThroughAny } from '@kbn/zod-helpers';
import { PassThroughAny as PassThroughAnyV4 } from '@kbn/zod-helpers/v4';
import { DeepStrict } from '@kbn/zod-helpers/v4';
import { convert, convertPathParameters, convertQuery } from './lib';

import { createLargeSchema, createLargeSchemaV4 } from './lib.test.util';

describe('zod', () => {
  describe('convert', () => {
    test('base case', () => {
      expect(convert(createLargeSchema())).toEqual({
        schema: {
          additionalProperties: false,
          properties: {
            any: {
              description: 'any type',
            },
            booleanDefault: {
              default: true,
              description: 'defaults to to true',
              type: 'boolean',
            },
            booleanFromString: {
              anyOf: [
                {
                  enum: ['true', 'false'],
                  type: 'string',
                },
                {
                  type: 'boolean',
                },
              ],
              default: false,
              description: 'boolean or string "true" or "false"',
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
              items: {
                items: [
                  {
                    type: 'string',
                  },
                  {
                    type: 'string',
                  },
                ],
                maxItems: 2,
                minItems: 2,
                type: 'array',
              },
              maxItems: 125,
              type: 'array',
            },
            maybeNumber: {
              maximum: 1000,
              minimum: 1,
              type: 'number',
            },
            neverType: {
              not: {},
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
          required: ['string', 'ipType', 'literalType', 'neverType', 'map', 'record', 'union'],
          type: 'object',
        },
        shared: {},
      });
    });

    test('extracts title, description, and examples from JSON in describe()', () => {
      const schema = z
        .object({
          name: z.string(),
          age: z.number(),
        })
        .describe(
          JSON.stringify({
            title: 'User',
            description: 'A user object',
            examples: [{ name: 'John', age: 30 }],
          })
        );

      const result = convert(schema);

      expect(result.schema.title).toBe('User');
      expect(result.schema.description).toBe('A user object');
      // examples is supported at runtime but not in OpenAPI types
      expect((result.schema as any).examples).toEqual([{ name: 'John', age: 30 }]);
    });
  });

  describe('convertPathParameters', () => {
    test('base conversion', () => {
      expect(
        convertPathParameters(z.object({ a: z.string(), b: z.enum(['val1', 'val2']) }), {
          a: { optional: false },
          b: { optional: true },
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
          {
            in: 'path',
            name: 'b',
            required: true,
            schema: {
              enum: ['val1', 'val2'],
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
    test('throws if known parameters not found', () => {
      expect(() =>
        convertPathParameters(z.object({ b: z.string() }), { a: { optional: false } })
      ).toThrow(
        'Path expects key "a" from schema but it was not found. Existing schema keys are: b'
      );
    });
    test('throws for mixed union', () => {
      expect(() =>
        convertPathParameters(z.object({ a: z.union([z.string(), z.number()]) }), {
          a: { optional: false },
        })
      ).toThrow(
        '[Zod converter] Input parser key: "a" must be ZodString, ZodNumber, ZodBoolean, ZodBigInt or ZodDate'
      );
    });
    test('handles passThrough', () => {
      expect(
        convertPathParameters(PassThroughAny, {
          a: { optional: false },
          b: { optional: true },
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
          {
            in: 'path',
            name: 'b',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
  });

  describe('convertQuery', () => {
    test('base conversion', () => {
      expect(
        convertQuery(z.object({ a: z.string(), b: z.enum(['val1', 'val2']).optional() }))
      ).toEqual({
        query: [
          {
            in: 'query',
            name: 'a',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            in: 'query',
            name: 'b',
            required: false,
            schema: {
              enum: ['val1', 'val2'],
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
    test('allows mixed union of coercible types', () => {
      expect(
        convertQuery(
          z.object({ a: z.optional(BooleanFromString).describe('string or boolean flag') })
        )
      ).toEqual({
        query: [
          {
            in: 'query',
            name: 'a',
            required: false,
            schema: {
              anyOf: [
                {
                  enum: ['true', 'false'],
                  type: 'string',
                },
                {
                  type: 'boolean',
                },
              ],
            },
            description: 'string or boolean flag',
          },
        ],
        shared: {},
      });
    });
    test('handles passThrough', () => {
      expect(convertQuery(PassThroughAny)).toEqual({
        query: [],
        shared: {},
      });
    });
  });
});

describe('DeepStrict-wrapped v3 schemas (mixed v3/v4)', () => {
  test('convert correctly handles DeepStrict-wrapped v3 body schema', () => {
    // This simulates what happens in makeZodValidationObject:
    // v3 Zod schemas get wrapped with v4 DeepStrict, creating a v4 pipe around v3 inner schemas
    const v3BodySchema = z.object({
      name: z.string(),
      age: z.number().optional(),
    });
    const wrapped = DeepStrict(v3BodySchema as any);

    const result = convert(wrapped as any);
    expect(result.shared).toEqual({});
    expect(result.schema).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
        age: { type: 'number' },
      },
      required: ['name'],
    });
  });

  test('convertPathParameters handles DeepStrict-wrapped v3 path schema', () => {
    const v3PathSchema = z.object({ id: z.string() });
    const wrapped = DeepStrict(v3PathSchema as any);

    expect(convertPathParameters(wrapped as any, { id: { optional: false } })).toEqual({
      params: [
        {
          in: 'path',
          name: 'id',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ],
      shared: {},
    });
  });

  test('convertQuery handles DeepStrict-wrapped v3 query schema', () => {
    const v3QuerySchema = z.object({ page: z.string().optional(), size: z.string() });
    const wrapped = DeepStrict(v3QuerySchema as any);

    const result = convertQuery(wrapped as any);
    expect(result.query).toEqual([
      {
        in: 'query',
        name: 'page',
        required: false,
        schema: {
          type: 'string',
        },
      },
      {
        in: 'query',
        name: 'size',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ]);
  });
});

describe('zod v4', () => {
  describe('convert', () => {
    test('base case', () => {
      const result = convert(createLargeSchemaV4() as any);
      expect(result.shared).toEqual({});
      expect(result.schema).toMatchObject({
        type: 'object',
        properties: {
          string: { type: 'string', maxLength: 10, minLength: 1 },
          maybeNumber: { type: 'number', maximum: 1000, minimum: 1 },
          booleanDefault: { type: 'boolean', default: true },
          ipType: { type: 'string' },
          literalType: expect.objectContaining({ type: 'string' }),
          record: {
            type: 'object',
            additionalProperties: { type: 'string' },
          },
          uri: { type: 'string', default: 'prototest://something' },
        },
        required: expect.arrayContaining(['string', 'ipType', 'literalType', 'neverType']),
      });
    });
  });

  describe('convertPathParameters', () => {
    test('base conversion', () => {
      expect(
        convertPathParameters(z4.object({ a: z4.string(), b: z4.enum(['val1', 'val2']) }), {
          a: { optional: false },
          b: { optional: true },
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
          {
            in: 'path',
            name: 'b',
            required: true,
            schema: {
              enum: ['val1', 'val2'],
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });

    test('throws if known parameters not found', () => {
      expect(() =>
        convertPathParameters(z4.object({ b: z4.string() }), { a: { optional: false } })
      ).toThrow(
        'Path expects key "a" from schema but it was not found. Existing schema keys are: b'
      );
    });

    test('handles passThrough', () => {
      expect(
        convertPathParameters(PassThroughAnyV4, {
          a: { optional: false },
          b: { optional: true },
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
          {
            in: 'path',
            name: 'b',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });

    test('handles DeepStrict-wrapped v4 schemas', () => {
      const pathSchema = z4.object({ name: z4.string() });
      const wrapped = DeepStrict(pathSchema);
      expect(convertPathParameters(wrapped as any, { name: { optional: false } })).toEqual({
        params: [
          {
            in: 'path',
            name: 'name',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });
  });

  describe('convertQuery', () => {
    test('base conversion', () => {
      expect(
        convertQuery(z4.object({ a: z4.string(), b: z4.enum(['val1', 'val2']).optional() }))
      ).toEqual({
        query: [
          {
            in: 'query',
            name: 'a',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            in: 'query',
            name: 'b',
            required: false,
            schema: {
              enum: ['val1', 'val2'],
              type: 'string',
            },
          },
        ],
        shared: {},
      });
    });

    test('handles transform schemas (like dateFromString)', () => {
      const dateFromString = z4.string().transform((input) => new Date(input));
      const schema = z4.object({ from: dateFromString, to: dateFromString });
      const result = convertQuery(schema);
      expect(result.query).toHaveLength(2);
      expect(result.query[0]).toMatchObject({
        name: 'from',
        in: 'query',
        required: true,
        schema: { type: 'string' },
      });
      expect(result.query[1]).toMatchObject({
        name: 'to',
        in: 'query',
        required: true,
        schema: { type: 'string' },
      });
    });

    test('handles DeepStrict-wrapped v4 query schemas', () => {
      const querySchema = z4.object({ page: z4.string().optional(), size: z4.string() });
      const wrapped = DeepStrict(querySchema);
      const result = convertQuery(wrapped as any);
      expect(result.query).toEqual([
        {
          in: 'query',
          name: 'page',
          required: false,
          schema: {
            type: 'string',
          },
        },
        {
          in: 'query',
          name: 'size',
          required: true,
          schema: {
            type: 'string',
          },
        },
      ]);
    });

    test('handles passThrough', () => {
      expect(convertQuery(PassThroughAnyV4)).toEqual({
        query: [],
        shared: {},
      });
    });
  });
});
