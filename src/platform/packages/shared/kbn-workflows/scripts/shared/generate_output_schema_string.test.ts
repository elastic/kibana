/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenAPIV3 } from 'openapi-types';
import { generateOutputSchemaString, getResponseSchemaName } from './generate_output_schema_string';

const minimalDocument: OpenAPIV3.Document = {
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  paths: {},
};

const makeOperationWithResponse = (
  operationId: string,
  schema: OpenAPIV3.SchemaObject = {
    type: 'object',
    properties: { hits: { type: 'array', items: { type: 'object' } } },
  }
): OpenAPIV3.OperationObject => ({
  operationId,
  responses: {
    '200': {
      description: 'OK',
      content: {
        'application/json': { schema },
      },
    },
  },
});

describe('getResponseSchemaName', () => {
  it('should return the operation id suffixed with _response', () => {
    expect(getResponseSchemaName('search')).toBe('search_response');
  });
});

describe('generateOutputSchemaString', () => {
  it('should return optional looseObject when no operations have response schemas', () => {
    expect(generateOutputSchemaString([], minimalDocument)).toBe('z.optional(z.looseObject({}))');
  });

  it('should return a single schema name for one operation', () => {
    const operations = [makeOperationWithResponse('search')];
    expect(generateOutputSchemaString(operations, minimalDocument)).toBe('search_response');
  });

  it('should return a z.union for multiple operations', () => {
    const operations = [
      makeOperationWithResponse('search'),
      makeOperationWithResponse('indices.create'),
    ];
    expect(generateOutputSchemaString(operations, minimalDocument)).toBe(
      'z.union([search_response, indices_create_response])'
    );
  });

  it('should filter out operations without a 200 response', () => {
    const opWithout200: OpenAPIV3.OperationObject = {
      operationId: 'delete',
      responses: { '204': { description: 'No Content' } },
    };
    const result = generateOutputSchemaString(
      [opWithout200, makeOperationWithResponse('search')],
      minimalDocument
    );
    expect(result).toBe('search_response');
  });

  it('should filter out operations with an empty response schema', () => {
    const opWithEmptySchema = makeOperationWithResponse('empty', {});
    const result = generateOutputSchemaString([opWithEmptySchema], minimalDocument);
    expect(result).toBe('z.optional(z.looseObject({}))');
  });
});
