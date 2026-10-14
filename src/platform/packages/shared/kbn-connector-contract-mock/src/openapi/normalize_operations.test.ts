/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';
import { normalizeOperations, toUnicodePattern } from './normalize_operations';

const loadNormalizedSchemas = (schemas: Record<string, unknown>, openapi = '3.0.3') => {
  const [operation] = normalizeOperations(
    loadOperations({
      openapi,
      info: { title: 'Test', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
              },
            },
          },
        },
      },
      components: { schemas },
    })
  );
  const { components } = operation.spec.document as {
    components: { schemas: Record<string, Record<string, unknown>> };
  };
  return components.schemas;
};

describe('toUnicodePattern', () => {
  it('drops backslashes from identity escapes that the u flag rejects', () => {
    expect(toUnicodePattern('^[A-Za-z][A-Za-z0-9\\.\\-\\_:\\/]*$')).toBe(
      '^[A-Za-z][A-Za-z0-9\\.\\-_:\\/]*$'
    );
  });

  it('removes an escaped hyphen outside a character class', () => {
    expect(toUnicodePattern('^a\\-b$')).toBe('^a-b$');
  });

  it('leaves valid patterns untouched', () => {
    expect(toUnicodePattern('^\\d{3}\\.\\w+$')).toBe('^\\d{3}\\.\\w+$');
  });
});

describe('normalizeOperations', () => {
  it('follows refs and turns nullable without type into a union with null', () => {
    const { Owner } = loadNormalizedSchemas({
      Item: { type: 'object', properties: { owner: { $ref: '#/components/schemas/Owner' } } },
      Owner: { nullable: true, allOf: [{ type: 'string' }] },
    });

    expect(Owner).toEqual({ anyOf: [{ allOf: [{ type: 'string' }] }, { type: 'null' }] });
  });

  it('adds null to the type and enum of nullable schemas', () => {
    const { Item } = loadNormalizedSchemas({
      Item: {
        type: 'object',
        nullable: true,
        properties: {
          state: { type: 'string', enum: ['open'], nullable: true },
          count: { type: ['integer', 'null'], nullable: true },
          name: { type: 'string', nullable: false },
        },
      },
    });

    expect(Item).toEqual({
      type: ['object', 'null'],
      properties: {
        state: { type: ['string', 'null'], enum: ['open', null] },
        count: { type: ['integer', 'null'] },
        name: { type: 'string' },
      },
    });
  });

  it('removes duplicate enum values and repairs patterns', () => {
    const { Item } = loadNormalizedSchemas({
      Item: { type: 'string', enum: ['a', 'b', 'a'], pattern: '^\\_x$' },
    });

    expect(Item).toMatchObject({ enum: ['a', 'b'], pattern: '^_x$' });
  });

  it('does not rewrite example values that look like schema keywords', () => {
    const { Item } = loadNormalizedSchemas({
      Item: { type: 'object', example: { nullable: true, enum: [1, 1] } },
    });

    expect(Item.example).toEqual({ nullable: true, enum: [1, 1] });
  });

  it('converts boolean exclusive bounds in OpenAPI 3.0 only', () => {
    const bounds = {
      type: 'integer',
      minimum: 0,
      exclusiveMinimum: true,
      maximum: 9,
      exclusiveMaximum: false,
    };

    expect(loadNormalizedSchemas({ Item: { ...bounds } }).Item).toEqual({
      type: 'integer',
      exclusiveMinimum: 0,
      maximum: 9,
    });
    expect(loadNormalizedSchemas({ Item: { ...bounds } }, '3.1.0').Item).toEqual(bounds);
  });
});
