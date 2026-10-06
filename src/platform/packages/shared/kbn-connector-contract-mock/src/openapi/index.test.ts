/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations, SchemaCompileError } from '.';

const documentWith = (schemas: Record<string, unknown>) => ({
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  paths: {
    '/items': {
      post: {
        requestBody: {
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
        },
        responses: {
          '201': {
            description: 'created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
          },
        },
      },
    },
  },
  components: { schemas },
});

describe('loadContractOperations', () => {
  it('loads specs whose schema defects can be repaired', () => {
    const operations = loadContractOperations(
      documentWith({ Item: { nullable: true, enum: ['a', 'a'], pattern: '^\\_$' } })
    );

    expect(operations).toHaveLength(1);
  });

  it('fails with every operation and location whose schema cannot be compiled', () => {
    const load = () =>
      loadContractOperations(documentWith({ Item: { $ref: '#/components/schemas/Missing' } }));

    expect(load).toThrow(SchemaCompileError);
    expect(load).toThrow(/POST \/items \(request body application\/json\)/);
    expect(load).toThrow(/POST \/items \(response 201 application\/json\)/);
  });

  it('reports defects in components reached through nested refs', () => {
    const load = () =>
      loadContractOperations(
        documentWith({
          Item: { type: 'object', properties: { name: { $ref: '#/components/schemas/Name' } } },
          Name: { type: 'string', pattern: '(' },
        })
      );

    expect(load).toThrow(
      /POST \/items \(request body application\/json\): Invalid regular expression/
    );
  });
});
