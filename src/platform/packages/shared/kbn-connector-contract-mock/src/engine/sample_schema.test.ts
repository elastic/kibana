/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { sampleSchema } from './sample_schema';

const sample = (schema: unknown, schemas = {}) => sampleSchema(schema, { components: { schemas } });

describe('sampleSchema', () => {
  it.each([
    ['examples', { type: 'string', examples: ['ex'], default: 'def' }, 'ex'],
    ['default', { type: 'string', default: 'def', enum: ['a'] }, 'def'],
    ['const', { const: 3 }, 3],
    ['the first enum value', { type: 'string', enum: ['a', 'b'] }, 'a'],
  ])('prefers %s', (_, schema, expected) => {
    expect(sample(schema)).toBe(expected);
  });

  it.each([
    [{ type: 'string', format: 'date-time' }, '2026-01-01T00:00:00Z'],
    [{ type: 'string', format: 'uuid' }, '00000000-0000-4000-8000-000000000000'],
    [{ type: 'string', minLength: 10 }, 'stringxxxx'],
    [{ type: 'string', maxLength: 3 }, 'str'],
    [{ type: 'integer', minimum: 5 }, 5],
    [{ type: 'integer', exclusiveMinimum: 5 }, 6],
    [{ type: 'number', maximum: -2 }, -2],
    [{ type: 'boolean' }, true],
    [{ type: ['null', 'string'] }, 'string'],
    [{ type: 'integer', minimum: 5, multipleOf: 4 }, 8],
    [{ type: 'number', multipleOf: 0.25, minimum: 0.1 }, 0.25],
    [{ type: 'string', pattern: '^[0-9a-fA-F]{24}$' }, 'a'.repeat(24)],
    [{ type: 'string', pattern: '^[A-Z]{2}-\\d+$', minLength: 6 }, 'AA-000'],
    [{ type: 'array', items: { type: 'string' }, maxItems: 0 }, []],
  ])('builds a placeholder for %j', (schema, expected) => {
    expect(sample(schema)).toEqual(expected);
  });

  it('builds objects and arrays, resolving refs against the document', () => {
    const schemas = { Tag: { type: 'object', properties: { name: { type: 'string' } } } };
    const schema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { $ref: '#/components/schemas/Tag' } },
        pair: { type: 'array', minItems: 2, items: { type: 'integer' } },
      },
    };

    expect(sample(schema, schemas)).toEqual({ tags: [{ name: 'string' }], pair: [0, 0] });
  });

  it('fills required properties the schema never declares', () => {
    const properties = { id: { type: 'integer' } };
    const required = ['id', 'archived_at'];

    expect(sample({ type: 'object', properties, required })).toEqual({ id: 0, archived_at: null });
    expect(
      sample({ type: 'object', properties, required, additionalProperties: { type: 'string' } })
    ).toEqual({ id: 0, archived_at: 'string' });
  });

  it('takes the first non-null variant and merges allOf parts', () => {
    expect(sample({ anyOf: [{ type: 'null' }, { type: 'integer' }] })).toBe(0);
    expect(
      sample({
        allOf: [
          { type: 'object', properties: { a: { type: 'string' } } },
          { type: 'object', properties: { b: { type: 'boolean' } } },
        ],
      })
    ).toEqual({ a: 'string', b: true });
  });

  it('combines the constraints of a property declared by several allOf parts', () => {
    const schemas = {
      Trait: { type: 'object', properties: { type: { type: 'string' }, id: { type: 'string' } } },
    };
    const schema = {
      allOf: [
        { type: 'object', properties: { type: { type: 'string', enum: ['DOCUMENT'] } } },
        { $ref: '#/components/schemas/Trait' },
      ],
    };

    expect(sample(schema, schemas)).toEqual({ type: 'DOCUMENT', id: 'string' });
  });

  it('keeps samples of recursive schemas finite', () => {
    const schemas = {
      Node: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          children: { type: 'array', items: { $ref: '#/components/schemas/Node' } },
        },
      },
    };

    expect(sample({ $ref: '#/components/schemas/Node' }, schemas)).toEqual({
      id: 'string',
      children: [{ id: 'string', children: [{ id: 'string' }] }],
    });
  });
});
