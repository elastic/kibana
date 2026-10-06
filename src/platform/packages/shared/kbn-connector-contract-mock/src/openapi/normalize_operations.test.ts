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

const loadNormalized = (parameters: unknown[], schemas: Record<string, unknown>) =>
  normalizeOperations(
    loadOperations({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1' },
      paths: {
        '/items': {
          get: {
            parameters,
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
  )[0];

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
  it('turns nullable without type into a union with null', () => {
    const { __bundled__ } = loadNormalized([], {
      Item: {
        type: 'object',
        properties: { owner: { nullable: true, allOf: [{ type: 'string' }] } },
      },
    });

    expect(__bundled__.Item.properties?.owner).toEqual({
      anyOf: [{ allOf: [{ type: 'string' }] }, { type: 'null' }],
    });
  });

  it('removes duplicate enum values and repairs patterns', () => {
    const { __bundled__ } = loadNormalized([], {
      Item: { type: 'string', enum: ['a', 'b', 'a'], pattern: '^\\_x$' },
    });

    expect(__bundled__.Item).toMatchObject({ enum: ['a', 'b'], pattern: '^_x$' });
  });

  it('does not rewrite example values that look like schema keywords', () => {
    const { __bundled__ } = loadNormalized([], {
      Item: { type: 'object', example: { nullable: true, enum: [1, 1] } },
    });

    expect(__bundled__.Item.examples).toEqual([{ nullable: true, enum: [1, 1] }]);
  });

  it('drops null from parameter type unions so array parameters are split', () => {
    const { request } = loadNormalized(
      [
        {
          name: 'ids',
          in: 'query',
          explode: false,
          schema: { type: 'array', nullable: true, items: { type: 'string' } },
        },
      ],
      { Item: { type: 'object' } }
    );

    expect(request?.query?.[0].schema?.type).toBe('array');
  });
});
