/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations } from '.';
import type { RequestInput } from './validate_request';
import { validateRequest } from './validate_request';

const item = { $ref: '#/components/schemas/Item' };

const [operation] = loadContractOperations({
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  paths: {
    '/items/{id}': {
      put: {
        parameters: [
          { name: 'id', in: 'path', schema: { type: 'integer' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
          { name: 'tags', in: 'query', explode: false, schema: { type: 'array', items: {} } },
          { name: 'X-Key', in: 'header', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': { schema: item },
            'application/x-www-form-urlencoded': { schema: item },
          },
        },
        responses: { '200': { description: 'ok' } },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        required: ['id', 'name'],
        additionalProperties: false,
        properties: {
          id: { type: 'integer', readOnly: true },
          name: { type: 'string' },
          count: { type: 'integer' },
        },
      },
    },
  },
});

const validate = (input: Partial<RequestInput>) =>
  validateRequest(operation, {
    query: {},
    headers: { 'x-key': 'secret', 'content-type': 'application/json' },
    pathParameters: { id: '1' },
    body: { name: 'a' },
    ...input,
  });

const messages = (input: Partial<RequestInput>) => validate(input).map(({ message }) => message);

describe('validateRequest', () => {
  it('accepts a request that matches the contract, exempting required readOnly properties', () => {
    expect(validate({ query: { limit: '10', tags: 'a,b' } })).toEqual([]);
  });

  it('reports parameters that are missing or break their schema', () => {
    expect(
      validate({
        pathParameters: { id: 'abc' },
        query: { limit: '500' },
        headers: { 'content-type': 'application/json' },
      })
    ).toEqual([
      {
        path: ['path', 'id'],
        code: 'type',
        message:
          'Request path parameter id: Instance type "string" is invalid. Expected "integer".',
      },
      {
        path: ['query', 'limit'],
        code: 'maximum',
        message: 'Request query parameter limit: 500 is greater than 100.',
      },
      {
        path: ['header', 'X-Key'],
        code: 'required',
        message: 'Request header parameter X-Key is required',
      },
    ]);
  });

  it('reports undeclared and wrongly repeated query parameters', () => {
    expect(messages({ query: { other: '1', tags: ['a', 'b'] } })).toEqual([
      'Request query parameter other is not declared by the operation',
      'Request query parameter tags must be comma-separated (explode: false), not repeated',
    ]);
  });

  it('reports missing bodies, undeclared content types and schema violations', () => {
    expect(messages({ body: undefined })).toEqual(['Request body is required']);
    expect(messages({ headers: { 'x-key': 'k', 'content-type': 'text/plain' } })).toEqual([
      'Request content type text/plain is not one of application/json, application/x-www-form-urlencoded',
    ]);
    expect(validate({ body: { name: 1, extra: true } })).toEqual([
      {
        path: ['body', 'name'],
        code: 'type',
        message: 'Request body at /name: Instance type "number" is invalid. Expected "string".',
      },
      {
        path: ['body'],
        code: 'additionalProperties',
        message: 'Request body: Property "extra" does not match additional properties schema.',
      },
    ]);
  });

  it('parses and coerces form-urlencoded bodies', () => {
    const headers = { 'x-key': 'k', 'content-type': 'application/x-www-form-urlencoded' };

    expect(messages({ headers, body: 'name=a&count=2' })).toEqual([]);
    expect(messages({ headers, body: 'name=a&count=many' })).toEqual([
      'Request body at /count: Instance type "string" is invalid. Expected "integer".',
    ]);
  });
});
