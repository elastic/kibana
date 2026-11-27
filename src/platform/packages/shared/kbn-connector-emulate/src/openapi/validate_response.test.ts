/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadContractOperations } from '.';
import type { ResponseInput } from './validate_response';
import { validateResponse } from './validate_response';

const [operation] = loadContractOperations({
  openapi: '3.1.0',
  info: { title: 'Test', version: '1' },
  paths: {
    '/items': {
      get: {
        responses: {
          '200': {
            description: 'ok',
            headers: {
              'X-Rate-Limit': { required: true, schema: { type: 'integer' } },
              'Content-Type': { required: true, schema: { type: 'string' } },
            },
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'secret'],
                  properties: {
                    id: { type: 'integer', readOnly: true },
                    secret: { type: 'string', writeOnly: true },
                  },
                },
              },
            },
          },
          '4XX': {
            description: 'error',
            content: { '*/*': { schema: { type: 'object', required: ['error'] } } },
          },
        },
      },
    },
  },
});

const messages = (input: Partial<ResponseInput>) =>
  validateResponse(operation, {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Rate-Limit': '10' },
    body: { id: 1 },
    ...input,
  }).map(({ message }) => message);

describe('validateResponse', () => {
  it('accepts a response that matches the contract, exempting required writeOnly properties', () => {
    expect(messages({})).toEqual([]);
  });

  it('reports undeclared status codes and matches ranges', () => {
    expect(messages({ statusCode: 500 })).toEqual([
      'Response status 500 is not declared by the operation',
    ]);
    expect(messages({ statusCode: 404, body: {} })).toEqual([
      'Response body: Instance does not have required property "error".',
    ]);
  });

  it('reports headers that are missing or break their schema', () => {
    expect(messages({ headers: { 'content-type': 'application/json' } })).toEqual([
      'Response header X-Rate-Limit is required',
    ]);
    expect(
      messages({ headers: { 'content-type': 'application/json', 'x-rate-limit': 'many' } })
    ).toEqual([
      'Response header X-Rate-Limit: Instance type "string" is invalid. Expected "integer".',
    ]);
  });

  it('reports undeclared content types and body violations', () => {
    expect(messages({ headers: { 'content-type': 'text/html', 'x-rate-limit': '1' } })).toEqual([
      'Response content type text/html is not one of application/json',
    ]);
    expect(messages({ body: {} })).toEqual([
      'Response body: Instance does not have required property "id".',
    ]);
  });
});
