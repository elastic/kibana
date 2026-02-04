/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { convert, convertPathParameters, convertQuery } from './lib';

const BooleanFromString = z.union([z.enum(['true', 'false']), z.boolean()]);
const PassThroughAny = Object.assign(z.any(), { kbnTypeName: 'PassThroughAny' }) as z.ZodAny & {
  kbnTypeName: 'PassThroughAny';
};

import { createLargeSchema } from './lib.test.util';

describe('zod', () => {
  describe('convert', () => {
    test('base case', () => {
      expect(convert(createLargeSchema())).toEqual({
        schema: {
          additionalProperties: false,
          properties: {
            any: {},
            booleanDefault: {
              default: true,
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
            },
            ipType: {
              format: 'ipv4',
              pattern:
                '^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$',
              type: 'string',
            },
            literalType: {
              enum: ['literallythis'],
              type: 'string',
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
                  maxLength: 1,
                  type: 'string',
                },
                {
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
          required: [
            'string',
            'booleanDefault',
            'booleanFromString',
            'ipType',
            'literalType',
            'neverType',
            'record',
            'union',
            'uri',
            'any',
          ],
          type: 'object',
        },
        shared: {},
      });
    });

    // Validates that JSON Schema definitions get extracted to shared and refs are rewritten for OpenAPI
    describe('definitions extraction (recursive/shared schemas)', () => {
      test('extracts definitions to shared and rewrites refs to OpenAPI format', () => {
        interface TreeNode {
          value: string;
          children?: TreeNode[];
        }
        const TreeNodeSchema: z.ZodType<TreeNode> = z.lazy(() =>
          z.object({
            value: z.string(),
            children: z.array(TreeNodeSchema).optional(),
          })
        );

        const result = convert(TreeNodeSchema);

        expect(JSON.stringify(result.schema)).not.toContain('#/definitions/');
        expect(JSON.stringify(result.schema)).not.toContain('#/$defs/');

        if (Object.keys(result.shared).length > 0) {
          expect(JSON.stringify(result.shared)).not.toContain('#/definitions/');
          expect(JSON.stringify(result.shared)).not.toContain('#/$defs/');
        }
      });

      test('handles schema with multiple recursive references', () => {
        interface Person {
          name: string;
          friends?: Person[];
          bestFriend?: Person;
        }
        const PersonSchema: z.ZodType<Person> = z.lazy(() =>
          z.object({
            name: z.string(),
            friends: z.array(PersonSchema).optional(),
            bestFriend: PersonSchema.optional(),
          })
        );

        const result = convert(PersonSchema);

        const schemaStr = JSON.stringify(result.schema);
        const sharedStr = JSON.stringify(result.shared);
        expect(schemaStr).not.toContain('#/definitions/');
        expect(schemaStr).not.toContain('#/$defs/');
        expect(sharedStr).not.toContain('#/definitions/');
        expect(sharedStr).not.toContain('#/$defs/');
      });

      test('non-recursive schemas return empty shared', () => {
        const simpleSchema = z.object({
          name: z.string(),
          age: z.number(),
        });

        const result = convert(simpleSchema);

        expect(result.shared).toEqual({});
        expect(result.schema).toEqual({
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
          },
          required: ['name', 'age'],
          additionalProperties: false,
        });
      });
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
          z.object({
            a: z.optional(BooleanFromString).describe('string or boolean flag'),
          })
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
