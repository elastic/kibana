/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import { BooleanFromString, PassThroughAny } from '@kbn/zod-helpers';
import { convert, convertPathParameters, convertQuery } from './lib';

import { createLargeSchema } from './lib.test.util';

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
