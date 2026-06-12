/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OasConverter } from '.';
import { schema } from '@kbn/config-schema';
import { z } from '@kbn/zod/v4';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers/v4';

describe('OasConverter', () => {
  it('converts schemas with refs', () => {
    const converter = new OasConverter();
    const obj = schema.object({ foo: schema.string() }, { meta: { id: 'test' } });
    const obj2 = schema.object({ bar: schema.string(), fooObject: obj });
    const oasSchema = converter.convert(obj2);
    expect(oasSchema).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        bar: {
          type: 'string',
        },
        fooObject: {
          $ref: '#/components/schemas/test',
        },
      },
      required: ['bar', 'fooObject'],
    });

    expect(converter.getSchemaComponents()).toEqual({
      schemas: {
        test: {
          type: 'object',
          title: 'test',
          additionalProperties: false,
          properties: {
            foo: {
              type: 'string',
            },
          },
          required: ['foo'],
        },
      },
    });
  });

  it('maps field availability metadata to x-state', () => {
    const converter = new OasConverter();
    const obj = schema.object({
      foo: schema.string({
        meta: { availability: { stability: 'stable', since: '9.4.0' } },
      }),
    });

    expect(converter.convert(obj)).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: {
          type: 'string',
          'x-state': 'Generally available; added in 9.4.0',
        },
      },
      required: ['foo'],
    });
  });

  it('omits field since metadata from x-state in serverless mode', () => {
    const converter = new OasConverter({ serverless: true });
    const obj = schema.object({
      foo: schema.string({
        meta: { availability: { stability: 'stable', since: '9.4.0' } },
      }),
    });

    expect(converter.convert(obj)).toEqual({
      type: 'object',
      additionalProperties: false,
      properties: {
        foo: {
          type: 'string',
          'x-state': 'Generally available',
        },
      },
      required: ['foo'],
    });
  });

  describe('unwraps Zod schemas from buildRouteValidationWithZod', () => {
    it('converts query parameters from a wrapped Zod schema', () => {
      const converter = new OasConverter();
      const querySchema = z.object({
        include_components: z.boolean().optional().describe('Return component-level details'),
        page: z.number().int().optional().describe('Page number'),
      });
      const wrapped = buildRouteValidationWithZod(querySchema);

      const result = converter.convertQuery(wrapped);
      expect(result.length).toBe(2);
      expect(result.map((p) => p.name).sort()).toEqual(['include_components', 'page']);
      expect(result.find((p) => p.name === 'include_components')).toMatchObject({
        in: 'query',
        required: false,
        schema: { type: 'boolean' },
        description: 'Return component-level details',
      });
    });

    it('converts path parameters from a wrapped Zod schema', () => {
      const converter = new OasConverter();
      const paramsSchema = z.object({
        entityType: z.enum(['user', 'host']).describe('The entity type'),
      });
      const wrapped = buildRouteValidationWithZod(paramsSchema);

      const result = converter.convertPathParameters(wrapped, {
        entityType: { optional: false },
      });
      expect(result.length).toBe(1);
      expect(result[0]).toMatchObject({
        name: 'entityType',
        in: 'path',
        required: true,
        description: 'The entity type',
      });
    });

    it('converts body schema from a wrapped Zod schema', () => {
      const converter = new OasConverter();
      const bodySchema = z.object({
        name: z.string().describe('Entity name'),
        tags: z.array(z.string()).optional().describe('Tags'),
      });
      const wrapped = buildRouteValidationWithZod(bodySchema);

      const result = converter.convert(wrapped);
      expect(result).toMatchObject({
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Entity name' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags' },
        },
        required: ['name'],
      });
    });
  });
});
