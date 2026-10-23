/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createEmulatorFetch } from './create_emulator_fetch';

const spec = {
  openapi: '3.0.3',
  info: { title: 'Test', version: '1' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/items/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        operationId: 'getItem',
        responses: {
          '200': {
            description: 'ok',
            headers: { 'x-rate-limit': { required: true, schema: { type: 'integer' } } },
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
          },
          '404': { description: 'missing' },
        },
      },
      put: {
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Item' } } },
        },
        responses: {
          '200': {
            description: 'ok',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Item' },
                example: { name: 'Lamp', state: 'open' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Item: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
          state: { type: 'string', enum: ['open', 'closed'] },
          parent: { $ref: '#/components/schemas/Item' },
        },
      },
    },
  },
};

describe('describeOperation', () => {
  const { describeOperation } = createEmulatorFetch({ specs: [spec] });

  it('lists parameters and responses, with schemas inlined and a sample that conforms', () => {
    const description = describeOperation('getItem');

    expect(description).toMatchObject({
      id: 'getItem',
      method: 'GET',
      path: '/items/{id}',
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      responses: [
        {
          status: '200',
          headers: [{ name: 'x-rate-limit', required: true, schema: { type: 'integer' } }],
          contents: [
            {
              mediaType: 'application/json',
              schema: {
                type: 'object',
                required: ['name'],
                properties: { state: { type: 'string', enum: ['open', 'closed'] } },
              },
              examples: [],
              sample: { name: 'string', state: 'open' },
            },
          ],
        },
        { status: '404', headers: [], contents: [] },
      ],
    });
  });

  it('stops inlining recursive schemas a few levels deep', () => {
    const [{ contents }] = describeOperation('getItem')?.responses ?? [];

    expect(JSON.stringify(contents[0].schema)).toContain('"$ref":"#/components/schemas/Item"');
  });

  it('samples a response from its example, and describes the request body', () => {
    const description = describeOperation('PUT /items/{id}');

    expect(description?.requestBody).toMatchObject({
      required: true,
      contents: [{ mediaType: 'application/json', schema: { type: 'object' } }],
    });
    expect(description?.requestBody?.contents[0]).not.toHaveProperty('sample');
    expect(description?.responses[0].contents[0].sample).toEqual({ name: 'Lamp', state: 'open' });
  });

  it('describes no operation for an unknown id', () => {
    expect(describeOperation('deleteItem')).toBeUndefined();
  });
});
