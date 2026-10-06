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

  it('rejects unsupported versions and external refs', () => {
    expect(() => loadOperations({ swagger: '2.0', paths: {} })).toThrow(
      'Unsupported spec version unknown; expected OpenAPI 3.x'
    );
    expect(() =>
      loadOperations({
        openapi: '3.0.3',
        paths: { '/a': { get: { responses: { '200': { $ref: 'other.yaml#/Ok' } } } } },
      })
    ).toThrow('External $ref other.yaml#/Ok is not supported');
  });
});
