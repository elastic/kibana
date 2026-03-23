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
import { convert, convertPathParameters, convertQuery, resetDefsCounter } from './lib';

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
    beforeEach(() => resetDefsCounter());

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

    test('extracts $defs from recursive schemas to shared components', () => {
      // Simulate a recursive FilterCondition-like schema (and/or/not self-references)
      const filterCondition: z4.ZodType = z4.lazy(() =>
        z4.union([
          z4.object({ field: z4.string(), eq: z4.string() }),
          z4.object({ and: z4.array(filterCondition) }),
          z4.object({ or: z4.array(filterCondition) }),
          z4.object({ not: filterCondition }),
        ])
      );
      const bodySchema = z4.object({
        condition: filterCondition,
        name: z4.string(),
      });

      const result = convert(bodySchema as any);

      // $defs should NOT appear in the schema (moved to shared)
      expect(result.schema).not.toHaveProperty('$defs');

      // shared should contain the extracted recursive definition(s)
      const sharedKeys = Object.keys(result.shared);
      expect(sharedKeys.length).toBeGreaterThan(0);
      expect(sharedKeys[0]).toMatch(/^_zod_v4_\d+___schema\d+$/);

      // The schema should reference components/schemas instead of $defs
      const schemaStr = JSON.stringify(result.schema);
      expect(schemaStr).not.toContain('#/$defs/');
      expect(schemaStr).toContain('#/components/schemas/_zod_v4_');

      // The shared definitions should also have rewritten self-references
      const sharedStr = JSON.stringify(result.shared);
      expect(sharedStr).not.toContain('#/$defs/');

      // The schema should still have the expected top-level structure
      expect(result.schema).toMatchObject({
        type: 'object',
        required: expect.arrayContaining(['condition', 'name']),
        properties: {
          name: { type: 'string' },
          condition: { $ref: expect.stringContaining('#/components/schemas/_zod_v4_') },
        },
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

  describe('stable OAS component names via .meta({ id })', () => {
    beforeEach(() => resetDefsCounter());

    test('recursive schema: stable name used in $defs and $ref', () => {
      const condition: z4.ZodType = z4
        .lazy(() =>
          z4.union([
            z4.object({ field: z4.string(), eq: z4.string() }),
            z4.object({ and: z4.array(condition) }),
            z4.object({ or: z4.array(condition) }),
          ])
        )
        .meta({ id: 'Condition' });

      const body = z4.object({ condition, name: z4.string() });
      const result = convert(body as any);

      // components/schemas should use the stable name, not an auto-generated one
      expect(result.shared).toHaveProperty('Condition');
      expect(Object.keys(result.shared).some((k) => k.startsWith('_zod_v4_'))).toBe(false);

      // the body schema should reference the stable name
      expect(result.schema).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string' },
          condition: { $ref: '#/components/schemas/Condition' },
        },
      });

      // no COMPONENT_ID_MARKER should leak into the output
      const outputStr = JSON.stringify(result);
      expect(outputStr).not.toContain('x-kbn-oas-component-id');
    });

    test('non-recursive schema: stable name used when schema is inlined (single use)', () => {
      const address = z4.object({ street: z4.string(), city: z4.string() }).meta({ id: 'Address' });

      const body = z4.object({ address, name: z4.string() });
      const result = convert(body as any);

      // Address should be extracted to shared under the stable name
      expect(result.shared).toHaveProperty('Address');
      expect(result.shared.Address).toMatchObject({
        type: 'object',
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      });

      // the body schema should reference the stable name
      expect(result.schema).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: { $ref: '#/components/schemas/Address' },
        },
      });

      // no COMPONENT_ID_MARKER should leak into the output
      const outputStr = JSON.stringify(result);
      expect(outputStr).not.toContain('x-kbn-oas-component-id');
    });

    test('schema with .meta({ id }) passed directly to convert() produces $ref', () => {
      const tag = z4.object({ id: z4.string(), label: z4.string() }).meta({ id: 'Tag' });

      const result = convert(tag as any);

      expect(result.shared).toHaveProperty('Tag');
      expect(result.schema).toEqual({ $ref: '#/components/schemas/Tag' });
    });

    test('.meta({ openapi }) extensions are merged into the component schema', () => {
      const wired = z4.object({ type: z4.literal('wired') }).meta({ id: 'WiredDef' });
      const classic = z4.object({ type: z4.literal('classic') }).meta({ id: 'ClassicDef' });
      const streamDef = z4.union([wired, classic]).meta({
        id: 'StreamDefinition',
        openapi: {
          discriminator: {
            propertyName: 'type',
            mapping: {
              wired: '#/components/schemas/WiredDef',
              classic: '#/components/schemas/ClassicDef',
            },
          },
        },
      });

      const body = z4.object({ stream: streamDef });
      const result = convert(body as any);

      expect(result.shared).toHaveProperty('StreamDefinition');
      expect(result.shared.StreamDefinition).toMatchObject({
        discriminator: {
          propertyName: 'type',
          mapping: {
            wired: '#/components/schemas/WiredDef',
            classic: '#/components/schemas/ClassicDef',
          },
        },
      });

      // no markers should leak into the output
      const outputStr = JSON.stringify(result);
      expect(outputStr).not.toContain('x-kbn-oas-component-id');
      expect(outputStr).not.toContain('x-kbn-oas-extensions');
    });

    describe('z4.discriminatedUnion auto-discriminator', () => {
      test('auto-emits discriminator with mapping when all variants have meta({ id })', () => {
        const wired = z4.object({ type: z4.literal('wired'), name: z4.string() }).meta({
          id: 'AutoDisc_WiredDef',
        });
        const classic = z4.object({ type: z4.literal('classic'), id: z4.number() }).meta({
          id: 'AutoDisc_ClassicDef',
        });
        const streamDef = z4.discriminatedUnion('type', [wired, classic]).meta({
          id: 'AutoDisc_StreamDefinition',
        });

        const body = z4.object({ stream: streamDef });
        const result = convert(body as any);

        expect(result.shared).toHaveProperty('AutoDisc_StreamDefinition');
        expect(result.shared.AutoDisc_StreamDefinition).toMatchObject({
          discriminator: {
            propertyName: 'type',
            mapping: {
              wired: '#/components/schemas/AutoDisc_WiredDef',
              classic: '#/components/schemas/AutoDisc_ClassicDef',
            },
          },
        });

        // no markers should leak into the output
        const outputStr = JSON.stringify(result);
        expect(outputStr).not.toContain('x-kbn-oas-component-id');
        expect(outputStr).not.toContain('x-kbn-oas-extensions');
      });

      test('auto-emits discriminator without mapping when a variant lacks meta({ id })', () => {
        const wired = z4.object({ type: z4.literal('wired'), name: z4.string() }).meta({
          id: 'AutoDiscNoMap_WiredDef',
        });
        // No .meta({ id }) on this variant — mapping cannot be completed
        const classic = z4.object({ type: z4.literal('classic'), id: z4.number() });
        const streamDef = z4.discriminatedUnion('type', [wired, classic]).meta({
          id: 'AutoDiscNoMap_StreamDefinition',
        });

        const body = z4.object({ stream: streamDef });
        const result = convert(body as any);

        expect(result.shared).toHaveProperty('AutoDiscNoMap_StreamDefinition');
        expect(result.shared.AutoDiscNoMap_StreamDefinition).toMatchObject({
          discriminator: { propertyName: 'type' },
        });
        expect(
          (result.shared.AutoDiscNoMap_StreamDefinition as any).discriminator?.mapping
        ).toBeUndefined();
      });

      test('explicit .meta({ openapi }) takes precedence over auto-detection', () => {
        const wired = z4
          .object({ type: z4.literal('wired') })
          .meta({ id: 'AutoDiscExplicit_Wired' });
        const classic = z4.object({ type: z4.literal('classic') }).meta({
          id: 'AutoDiscExplicit_Classic',
        });
        const streamDef = z4.discriminatedUnion('type', [wired, classic]).meta({
          id: 'AutoDiscExplicit_StreamDefinition',
          openapi: {
            discriminator: {
              propertyName: 'type',
              mapping: {
                wired: '#/components/schemas/CustomWired',
                classic: '#/components/schemas/CustomClassic',
              },
            },
          },
        });

        const body = z4.object({ stream: streamDef });
        const result = convert(body as any);

        expect(result.shared.AutoDiscExplicit_StreamDefinition).toMatchObject({
          discriminator: {
            propertyName: 'type',
            mapping: {
              wired: '#/components/schemas/CustomWired',
              classic: '#/components/schemas/CustomClassic',
            },
          },
        });
      });

      test('plain z4.union is not affected', () => {
        const wired = z4.object({ type: z4.literal('wired') }).meta({ id: 'AutoDiscPlain_Wired' });
        const classic = z4.object({ type: z4.literal('classic') }).meta({
          id: 'AutoDiscPlain_Classic',
        });
        const streamDef = z4.union([wired, classic]).meta({ id: 'AutoDiscPlain_Stream' });

        const body = z4.object({ stream: streamDef });
        const result = convert(body as any);

        expect(result.shared).toHaveProperty('AutoDiscPlain_Stream');
        expect(result.shared.AutoDiscPlain_Stream).not.toHaveProperty('discriminator');
      });
    });
  });
});
