/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadOperations } from './load_operations';

const oas3Document = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  paths: {
    '/items/{id}': {
      get: {
        operationId: 'getItem',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'ok',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        properties: { child: { $ref: '#/components/schemas/Item' }, name: { type: 'string' } },
      },
    },
  },
};

describe('loadOperations', () => {
  it('points component refs into a bundle shared by all operations', () => {
    const [operation] = loadOperations(oas3Document);

    const nestedRef = { properties: { child: { $ref: '#/__bundled__/Item' } } };
    expect(operation.responses[0].contents?.[0].schema).toMatchObject(nestedRef);
    expect(operation.__bundled__.Item).toMatchObject(nestedRef);
  });

  it('loads Swagger 2.0 documents', () => {
    const [operation] = loadOperations({
      swagger: '2.0',
      info: { title: 'Test', version: '1' },
      produces: ['application/json'],
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                schema: { type: 'array', items: { $ref: '#/definitions/Item' } },
              },
            },
          },
        },
      },
      definitions: { Item: { type: 'object' } },
    });

    expect(operation.responses[0].contents?.[0].schema).toMatchObject({
      items: { $ref: '#/__bundled__/Item' },
    });
    expect(operation.__bundled__.Item).toMatchObject({ type: 'object' });
  });
});
