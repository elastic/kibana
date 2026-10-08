/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertSwagger2 } from './convert_swagger2';
import { loadOperations } from './load_operations';
import type { OpenApiDocument } from './types';

const swagger: OpenApiDocument = {
  swagger: '2.0',
  info: { title: 'Test', version: '1' },
  host: 'api.example.com',
  basePath: '/v2/',
  schemes: ['https'],
  produces: ['application/json'],
  parameters: {
    Limit: { name: 'limit', in: 'query', type: 'integer', maximum: 100 },
  },
  responses: {
    NotFound: { description: 'missing', schema: { $ref: '#/definitions/Error' } },
  },
  paths: {
    '/items/{id}': {
      parameters: [
        { name: 'id', in: 'path', required: true, type: 'string', 'x-ms-skip-url-encoding': true },
      ],
      get: {
        operationId: 'getItem',
        parameters: [
          { $ref: '#/parameters/Limit' },
          {
            name: 'tags',
            in: 'query',
            type: 'array',
            items: { type: 'string' },
            collectionFormat: 'pipes',
          },
          {
            name: 'ids',
            in: 'query',
            type: 'array',
            items: { type: 'string' },
            collectionFormat: 'multi',
          },
        ],
        responses: {
          '200': {
            description: 'ok',
            schema: { $ref: '#/definitions/Item' },
            headers: { 'X-Rate-Limit': { type: 'integer' } },
          },
          '404': { $ref: '#/responses/NotFound' },
        },
      },
      put: {
        consumes: ['application/xml'],
        parameters: [
          { name: 'item', in: 'body', required: true, schema: { $ref: '#/definitions/Item' } },
        ],
        responses: { '204': { description: 'updated' } },
      },
      post: {
        consumes: ['multipart/form-data'],
        parameters: [
          { name: 'file', in: 'formData', required: true, type: 'file' },
          { name: 'note', in: 'formData', type: 'string' },
        ],
        responses: { '201': { description: 'uploaded' } },
      },
    },
  },
  definitions: {
    Item: {
      type: 'object',
      properties: {
        parent: { $ref: '#/definitions/Item' },
        note: { type: 'string', 'x-nullable': true },
      },
    },
    Error: { type: 'object', discriminator: 'kind', properties: { kind: { type: 'string' } } },
  },
};

describe('convertSwagger2', () => {
  it('converts servers, schema refs and Swagger-only schema keywords', () => {
    const converted = convertSwagger2(swagger);

    expect(converted).toMatchObject({
      openapi: '3.0.3',
      servers: [{ url: 'https://api.example.com/v2' }],
      components: {
        schemas: {
          Item: {
            properties: {
              parent: { $ref: '#/components/schemas/Item' },
              note: { type: 'string', nullable: true },
            },
          },
          Error: { discriminator: { propertyName: 'kind' } },
        },
      },
    });
    expect(swagger.definitions).toMatchObject({
      Item: { properties: { parent: { $ref: '#/definitions/Item' } } },
    });
  });

  it('converts parameters, bodies and responses into loadable operations', () => {
    const [get, put, post] = loadOperations(swagger);

    expect(get.parameters).toMatchObject([
      {
        name: 'id',
        in: 'path',
        style: 'simple',
        schema: { schema: { type: 'string' } },
        multiSegment: true,
      },
      {
        name: 'limit',
        in: 'query',
        style: 'form',
        explode: true,
        schema: { schema: { type: 'integer', maximum: 100 } },
      },
      { name: 'tags', in: 'query', style: 'pipeDelimited', explode: false },
      { name: 'ids', in: 'query', style: 'form', explode: true },
    ]);
    expect(get.responses).toMatchObject([
      {
        code: '200',
        headers: [{ name: 'X-Rate-Limit', schema: { schema: { type: 'integer' } } }],
        contents: [
          {
            mediaType: 'application/json',
            schema: { schema: { $ref: '#/components/schemas/Item' } },
          },
        ],
      },
      { code: '404', contents: [{ schema: { schema: { $ref: '#/components/schemas/Error' } } }] },
    ]);
    expect(put.requestBody).toMatchObject({
      required: true,
      contents: [{ mediaType: 'application/xml' }],
    });
    expect(post.requestBody).toMatchObject({
      required: true,
      contents: [
        {
          mediaType: 'multipart/form-data',
          schema: {
            schema: {
              type: 'object',
              required: ['file'],
              properties: { file: { type: 'string', format: 'binary' }, note: { type: 'string' } },
            },
          },
        },
      ],
    });
  });

  it('uses the base path as a relative server URL when there is no host', () => {
    expect(convertSwagger2({ swagger: '2.0', basePath: '/api', paths: {} }).servers).toEqual([
      { url: '/api' },
    ]);
  });
});
