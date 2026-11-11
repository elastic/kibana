/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAtPointer } from './json_pointer';
import { loadOperations } from './load_operations';
import type { OpenApiDocument } from './types';

const itemRef = { $ref: '#/components/schemas/Item' };

const document: OpenApiDocument = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [
    {
      url: 'https://{region}.example.com/v1',
      variables: { region: { default: 'us', enum: ['us', 'eu'] } },
    },
  ],
  paths: {
    'x-internal': {},
    '/items/{id}': {
      parameters: [
        { name: 'id', in: 'path', schema: { type: 'string' } },
        { $ref: '#/components/parameters/Fields' },
      ],
      get: {
        operationId: 'getItem',
        parameters: [{ name: 'fields', in: 'query', explode: false, schema: { type: 'array' } }],
        responses: {
          '200': { $ref: '#/components/responses/Item' },
          'x-note': {},
        },
      },
      put: {
        servers: [{ url: 'https://upload.example.com' }],
        requestBody: { required: true, content: { 'application/json': { schema: itemRef } } },
        responses: { default: { description: 'error' } },
      },
    },
  },
  components: {
    parameters: {
      Fields: { name: 'fields', in: 'query', schema: { type: 'string' } },
    },
    responses: {
      Item: {
        description: 'ok',
        headers: { 'X-Rate-Limit': { required: true, schema: { type: 'integer' } } },
        content: { 'application/json': { schema: itemRef } },
      },
    },
    schemas: {
      Item: { type: 'object', properties: { child: itemRef } },
    },
  },
};

describe('loadOperations', () => {
  it('indexes operations with defaults, merged parameters and resolved responses', () => {
    const [get, put] = loadOperations(document);

    expect(get).toMatchObject({
      id: 'getItem',
      method: 'get',
      path: '/items/{id}',
      servers: [
        {
          url: 'https://{region}.example.com/v1',
          variables: { region: { default: 'us', enum: ['us', 'eu'] } },
        },
      ],
      parameters: [
        { name: 'id', in: 'path', required: true, style: 'simple', explode: false },
        { name: 'fields', in: 'query', required: false, style: 'form', explode: false },
      ],
      responses: [
        {
          code: '200',
          headers: [{ name: 'X-Rate-Limit', required: true }],
          contents: [{ mediaType: 'application/json' }],
        },
      ],
    });
    expect(put).toMatchObject({
      id: 'PUT /items/{id}',
      servers: [{ url: 'https://upload.example.com' }],
      requestBody: { required: true, contents: [{ mediaType: 'application/json' }] },
      responses: [{ code: 'default', contents: [], headers: [] }],
    });
  });

  it('keeps schemas and their refs in place, with pointers into the document', () => {
    const [get] = loadOperations(document);
    const { pointer, schema } = get.responses[0].contents[0].schema ?? { pointer: '', schema: {} };

    expect(pointer).toBe('/components/responses/Item/content/application~1json/schema');
    expect(schema).toEqual(itemRef);
    expect(getAtPointer(get.spec.document, pointer)).toBe(schema);
    expect(get.spec.document).not.toBe(document);
  });

  it('picks the schema dialect from the OpenAPI version', () => {
    const [operation] = loadOperations({ ...document, openapi: '3.1.0' });

    expect(operation.spec.dialect).toBe('draft-2020-12');
    expect(loadOperations(document)[0].spec.dialect).toBe('openapi-3.0');
  });

  it('keeps lowercase x- header and server variable names, which are not extensions', () => {
    const [operation] = loadOperations({
      openapi: '3.0.3',
      servers: [
        { url: 'https://{x-region}.example.com', variables: { 'x-region': { default: 'us' } } },
      ],
      paths: {
        '/a': {
          get: {
            responses: {
              '200': {
                description: 'ok',
                headers: { 'x-rate-limit': { schema: { type: 'integer' } } },
              },
            },
          },
        },
      },
    });

    expect(operation.servers[0].variables).toEqual({ 'x-region': { default: 'us' } });
    expect(operation.responses[0].headers).toMatchObject([{ name: 'x-rate-limit' }]);
  });

  it('keeps boolean schemas', () => {
    const [operation] = loadOperations({
      openapi: '3.1.0',
      paths: {
        '/a': { get: { responses: { '204': { content: { 'text/plain': { schema: false } } } } } },
      },
    });

    expect(operation.responses[0].contents[0].schema).toEqual({
      pointer: '/paths/~1a/get/responses/204/content/text~1plain/schema',
      schema: false,
    });
  });

  it('keeps the content of parameters described by content instead of a schema', () => {
    const [operation] = loadOperations({
      openapi: '3.2.0',
      paths: {
        '/a': {
          get: {
            parameters: [
              { name: 'filter', in: 'query', content: { 'application/json': { schema: itemRef } } },
              {
                name: 'search',
                in: 'querystring',
                content: { 'application/x-www-form-urlencoded': { schema: { type: 'object' } } },
              },
            ],
            responses: {},
          },
        },
      },
    });

    expect(operation.parameters).toMatchObject([
      {
        name: 'filter',
        in: 'query',
        schema: undefined,
        content: {
          mediaType: 'application/json',
          schema: { pointer: '/paths/~1a/get/parameters/0/content/application~1json/schema' },
        },
      },
      {
        name: 'search',
        in: 'querystring',
        content: { mediaType: 'application/x-www-form-urlencoded' },
      },
    ]);
  });

  it('indexes OpenAPI 3.2 query and additional operations', () => {
    const operations = loadOperations({
      openapi: '3.2.0',
      paths: {
        '/a': {
          query: { operationId: 'queryA', responses: {} },
          additionalOperations: { LINK: { operationId: 'linkA', responses: {} } },
        },
      },
    });

    expect(operations.map(({ id, method }) => ({ id, method }))).toEqual([
      { id: 'queryA', method: 'query' },
      { id: 'linkA', method: 'link' },
    ]);
  });

  it('merges a path item $ref with its sibling fields, which take precedence', () => {
    const operations = loadOperations({
      openapi: '3.1.0',
      paths: {
        '/a': {
          $ref: '#/components/pathItems/A',
          servers: [{ url: 'https://local.example.com' }],
          post: { operationId: 'localPost', responses: {} },
        },
      },
      components: {
        pathItems: {
          A: {
            parameters: [{ name: 'id', in: 'query', schema: { type: 'string' } }],
            servers: [{ url: 'https://shared.example.com' }],
            get: { operationId: 'sharedGet', responses: {} },
            post: { operationId: 'sharedPost', responses: {} },
          },
        },
      },
    });

    expect(operations).toMatchObject([
      {
        id: 'sharedGet',
        servers: [{ url: 'https://local.example.com' }],
        parameters: [
          { name: 'id', schema: { pointer: '/components/pathItems/A/parameters/0/schema' } },
        ],
      },
      { id: 'localPost' },
    ]);
  });

  it('rejects unsupported versions and external refs', () => {
    expect(() => loadOperations({ swagger: '1.2', paths: {} })).toThrow(
      'Unsupported spec version unknown; expected Swagger 2.0 or OpenAPI 3.x'
    );
    expect(() =>
      loadOperations({
        openapi: '3.0.3',
        paths: { '/a': { get: { responses: { '200': { $ref: 'other.yaml#/Ok' } } } } },
      })
    ).toThrow('External $ref other.yaml#/Ok is not supported');
  });
});
