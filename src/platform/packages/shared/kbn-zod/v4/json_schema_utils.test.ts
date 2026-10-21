/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import { inlineRootJsonSchemaRef, normalizeJsonSchemaTypeArrays } from './json_schema_utils';

const JSON_SCHEMA_TYPE_NAMES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'object',
  'array',
  'null',
]);

const findTypeArrays = (value: unknown, found: string[][] = []): string[][] => {
  if (value === null || typeof value !== 'object') {
    return found;
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      findTypeArrays(entry, found);
    }
    return found;
  }

  const record = value as Record<string, unknown>;
  const typeValue = record.type;
  if (
    Array.isArray(typeValue) &&
    typeValue.length > 0 &&
    typeValue.every((entry) => typeof entry === 'string' && JSON_SCHEMA_TYPE_NAMES.has(entry))
  ) {
    found.push(typeValue as string[]);
  }

  for (const entry of Object.values(record)) {
    findTypeArrays(entry, found);
  }

  return found;
};

describe('normalizeJsonSchemaTypeArrays', () => {
  it('rewrites nullable primitives from z.toJSONSchema (zod 4.6.5)', () => {
    const raw = z.toJSONSchema(z.string().nullable());
    const normalized = normalizeJsonSchemaTypeArrays(raw);

    expect(normalized).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'string',
      nullable: true,
    });
    expect(findTypeArrays(normalized)).toEqual([]);
    expect(raw.type).toEqual(['string', 'null']);
  });

  it('rewrites primitive unions from z.toJSONSchema', () => {
    const raw = z.toJSONSchema(z.union([z.string(), z.number()]));
    const normalized = normalizeJsonSchemaTypeArrays(raw);

    expect(normalized).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      anyOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(findTypeArrays(normalized)).toEqual([]);
  });

  it('rewrites nested object properties with nullable and union fields', () => {
    const schema = z.object({
      a: z.string().nullable(),
      b: z.union([z.string(), z.number()]),
      c: z.boolean().nullable().optional(),
      nested: z.object({
        flag: z.boolean().nullable(),
      }),
    });
    const raw = z.toJSONSchema(schema);
    const normalized = normalizeJsonSchemaTypeArrays(raw);

    expect(findTypeArrays(normalized)).toEqual([]);
    expect(normalized).toMatchObject({
      type: 'object',
      properties: {
        a: { type: 'string', nullable: true },
        b: { anyOf: [{ type: 'string' }, { type: 'number' }] },
        c: { type: 'boolean', nullable: true },
        nested: {
          type: 'object',
          properties: {
            flag: { type: 'boolean', nullable: true },
          },
        },
      },
    });
    expect((raw.properties as Record<string, { type: string[] }>).a.type).toEqual([
      'string',
      'null',
    ]);
  });

  it('rewrites nullable array items', () => {
    const raw = z.toJSONSchema(z.array(z.number().nullable()));
    const normalized = normalizeJsonSchemaTypeArrays(raw);

    expect(findTypeArrays(normalized)).toEqual([]);
    expect(normalized).toMatchObject({
      type: 'array',
      items: { type: 'number', nullable: true },
    });
  });

  it('handles type-only-null as type null without nullable', () => {
    expect(normalizeJsonSchemaTypeArrays({ type: ['null'] })).toEqual({ type: 'null' });
  });

  it('wraps existing anyOf with new type anyOf under allOf', () => {
    const input = {
      type: ['string', 'number'],
      anyOf: [{ type: 'boolean' }],
      description: 'mixed',
    };
    const normalized = normalizeJsonSchemaTypeArrays(input);

    expect(normalized).toEqual({
      description: 'mixed',
      allOf: [
        { anyOf: [{ type: 'boolean' }] },
        { anyOf: [{ type: 'string' }, { type: 'number' }] },
      ],
    });
    expect(findTypeArrays(normalized)).toEqual([]);
  });

  it('does not mutate the input schema', () => {
    const input = {
      type: 'object',
      properties: {
        value: { type: ['string', 'null'], title: 'Value' },
      },
    };
    const snapshot = JSON.parse(JSON.stringify(input));
    normalizeJsonSchemaTypeArrays(input);
    expect(input).toEqual(snapshot);
  });
});

describe('inlineRootJsonSchemaRef', () => {
  it('inlines default draft-2020-12 root $ref from z.toJSONSchema with meta id', () => {
    const raw = z.toJSONSchema(z.object({ x: z.string() }).meta({ id: 'Foo' }));
    const inlined = inlineRootJsonSchemaRef(raw);

    expect(inlined).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        x: { type: 'string' },
      },
      required: ['x'],
      $defs: {
        Foo: {
          type: 'object',
          properties: {
            x: { type: 'string' },
          },
        },
      },
    });
    expect(inlined).not.toHaveProperty('$ref');
    expect(raw).toHaveProperty('$ref', '#/$defs/Foo');
  });

  it('inlines draft-7 definitions root $ref', () => {
    const raw = z.toJSONSchema(z.object({ x: z.string() }).meta({ id: 'Foo' }), {
      target: 'draft-7',
    });
    const inlined = inlineRootJsonSchemaRef(raw);

    expect(inlined).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      definitions: {
        Foo: expect.any(Object),
      },
    });
    expect(inlined).not.toHaveProperty('$ref');
  });

  it('inlines openapi-3.0 definitions root $ref', () => {
    const raw = z.toJSONSchema(z.object({ x: z.string() }).meta({ id: 'Foo' }), {
      target: 'openapi-3.0',
    });
    const inlined = inlineRootJsonSchemaRef(raw);

    expect(inlined).toMatchObject({
      type: 'object',
      definitions: {
        Foo: expect.any(Object),
      },
    });
    expect(inlined).not.toHaveProperty('$ref');
  });

  it('keeps $defs when inlining recursive schemas', () => {
    interface Tree {
      children: Tree[];
    }
    const tree: z.ZodType<Tree> = z.object({
      children: z.array(z.lazy(() => tree)),
    });
    const raw = z.toJSONSchema(tree.meta({ id: 'Tree' }));
    const inlined = inlineRootJsonSchemaRef(raw);

    expect(inlined).toMatchObject({
      type: 'object',
      properties: {
        children: { $ref: '#/$defs/__schema0' },
      },
      $defs: expect.objectContaining({
        Tree: expect.any(Object),
        __schema0: expect.any(Object),
      }),
    });
    expect(inlined).not.toHaveProperty('$ref');
  });

  it('JSON-pointer-unescapes definition names', () => {
    const input = {
      $ref: '#/$defs/a~1b',
      $defs: {
        'a/b': { type: 'string' },
      },
    };
    expect(inlineRootJsonSchemaRef(input)).toEqual({
      $defs: { 'a/b': { type: 'string' } },
      type: 'string',
    });
  });

  it('returns input unchanged when root $ref cannot be resolved', () => {
    const input = { $ref: '#/$defs/Missing', $defs: {} };
    expect(inlineRootJsonSchemaRef(input)).toBe(input);
  });

  it('does not mutate the input schema', () => {
    const raw = z.toJSONSchema(z.object({ x: z.string() }).meta({ id: 'Foo' }));
    const snapshot = JSON.parse(JSON.stringify(raw));
    inlineRootJsonSchemaRef(raw);
    expect(raw).toEqual(snapshot);
  });
});
