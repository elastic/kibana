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

  describe('with object, content and form array parameters', () => {
    const [filtered] = loadContractOperations({
      openapi: '3.0.3',
      info: { title: 'Test', version: '1' },
      paths: {
        '/search': {
          post: {
            parameters: [
              {
                name: 'filter',
                in: 'query',
                schema: {
                  type: 'object',
                  properties: { min: { type: 'integer' }, name: { type: 'string' } },
                },
              },
              {
                name: 'where',
                in: 'query',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      required: ['state'],
                      properties: { state: { type: 'string' } },
                    },
                  },
                },
              },
            ],
            requestBody: {
              content: {
                'application/x-www-form-urlencoded': {
                  schema: {
                    type: 'object',
                    properties: {
                      tags: { type: 'array', items: { type: 'integer' } },
                      scope: {
                        oneOf: [
                          { type: 'string', enum: ['all'] },
                          { type: 'array', items: { type: 'integer' }, minItems: 2 },
                        ],
                      },
                    },
                  },
                },
              },
            },
            responses: { '200': { description: 'ok' } },
          },
        },
      },
    });
    const check = (query: RequestInput['query'], body?: string) =>
      validateRequest(filtered, {
        query,
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        pathParameters: {},
        body,
      }).map(({ message }) => message);

    it('reads exploded form-style objects from their property keys', () => {
      expect(check({ min: '1', name: 'x' })).toEqual([]);
      expect(check({ min: 'one' })).toEqual([
        'Request query parameter filter at /min: Instance type "string" is invalid. Expected "integer".',
      ]);
    });

    it('validates parameters described by JSON content', () => {
      expect(check({ where: '{"state":"open"}' })).toEqual([]);
      expect(check({ where: '{}' })).toEqual([
        'Request query parameter where: Instance does not have required property "state".',
      ]);
      expect(check({ where: '{state' })).toEqual([
        expect.stringMatching(/^Request query parameter where is not JSON/),
      ]);
    });

    it('reads a form field sent once as a one-item array when its property is an array', () => {
      expect(check({}, 'tags=1')).toEqual([]);
      expect(check({}, 'tags=1&tags=2')).toEqual([]);
    });

    it('keeps a form field sent once as a scalar when its property also allows one', () => {
      expect(check({}, 'scope=all')).toEqual([]);
      expect(check({}, 'scope=1&scope=2')).toEqual([]);
    });
  });
});
