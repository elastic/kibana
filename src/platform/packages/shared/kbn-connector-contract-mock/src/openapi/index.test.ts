/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { InvalidSchemaError, loadContractOperations } from '.';

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

  it('fails with every operation and location whose schema has a defect', () => {
    const load = () =>
      loadContractOperations(documentWith({ Item: { $ref: '#/components/schemas/Missing' } }));

    expect(load).toThrow(InvalidSchemaError);
    expect(load).toThrow(
      /POST \/items \(request body application\/json\): \$ref "#\/components\/schemas\/Missing" does not resolve/
    );
    expect(load).toThrow(/POST \/items \(response 201 application\/json\)/);
  });

  it.each([
    [{ type: 'text' }, 'type "text" is not a JSON Schema type'],
    [{ type: 'object', required: true }, 'required is not a list of property names'],
    [{ anyOf: [] }, 'anyOf is not a non-empty list of schemas'],
    [{ type: 'string', maxLength: '10' }, 'maxLength is not a number'],
    [{ type: 'object', patternProperties: { '[': {} } }, 'Invalid regular expression'],
  ])('fails on %j', (Item, message) => {
    expect(() => loadContractOperations(documentWith({ Item }))).toThrow(message);
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
