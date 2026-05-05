/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { resolve } from 'path';
import { loadOas } from '../input/load_oas';
import { buildRequestBodyIndex } from './build_request_body_index';
import type { OpenAPISpec } from '../input/load_oas';

const FIXTURES_DIR = resolve(__dirname, '__fixtures__', 'oas');

const fixturePath = (name: string, file: 'base' | 'current'): string =>
  resolve(FIXTURES_DIR, name, `${file}.yaml`);

describe('buildRequestBodyIndex', () => {
  it('returns an empty index for a spec with no request bodies', async () => {
    const oas = await loadOas(fixturePath('response_only_no_flag', 'current'));
    const index = buildRequestBodyIndex(oas);
    expect(index.size).toBe(0);
  });

  it('records a direct $ref consumer (component → operation)', async () => {
    const oas = await loadOas(fixturePath('component_body_tightened', 'current'));
    const index = buildRequestBodyIndex(oas);
    expect(index.get('Body')).toEqual([{ path: '/api/test', method: 'POST' }]);
  });

  it('records consumers from oneOf branches', async () => {
    const oas = await loadOas(fixturePath('oneof_body_tightened', 'current'));
    const index = buildRequestBodyIndex(oas);
    expect(index.get('A')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('B')).toEqual([{ path: '/api/test', method: 'POST' }]);
  });

  it('records consumers from anyOf branches', () => {
    const oas: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    anyOf: [{ $ref: '#/components/schemas/A' }, { $ref: '#/components/schemas/B' }],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          A: { type: 'object' },
          B: { type: 'object' },
        },
      },
    };
    const index = buildRequestBodyIndex(oas);
    expect(index.get('A')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('B')).toEqual([{ path: '/api/test', method: 'POST' }]);
  });

  it('records consumers from allOf branches', () => {
    const oas: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/test': {
          put: {
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    allOf: [{ $ref: '#/components/schemas/A' }, { type: 'object' }],
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          A: { type: 'object' },
        },
      },
    };
    const index = buildRequestBodyIndex(oas);
    expect(index.get('A')).toEqual([{ path: '/api/test', method: 'PUT' }]);
  });

  it('records transitively reachable components via properties, items, and additionalProperties', () => {
    const oas: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Top' },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          Top: {
            type: 'object',
            properties: {
              viaProp: { $ref: '#/components/schemas/ViaProp' },
              viaArray: {
                type: 'array',
                items: { $ref: '#/components/schemas/ViaItems' },
              },
              viaMap: {
                type: 'object',
                additionalProperties: { $ref: '#/components/schemas/ViaAddProps' },
              },
            },
          },
          ViaProp: { type: 'object' },
          ViaItems: { type: 'object' },
          ViaAddProps: { type: 'object' },
        },
      },
    };
    const index = buildRequestBodyIndex(oas);
    expect(index.get('Top')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('ViaProp')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('ViaItems')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('ViaAddProps')).toEqual([{ path: '/api/test', method: 'POST' }]);
  });

  it('terminates on circular $ref chains', () => {
    const oas: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/test': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/A' },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          A: {
            type: 'object',
            properties: {
              b: { $ref: '#/components/schemas/B' },
            },
          },
          B: {
            type: 'object',
            properties: {
              a: { $ref: '#/components/schemas/A' },
            },
          },
        },
      },
    };
    const index = buildRequestBodyIndex(oas);
    expect(index.get('A')).toEqual([{ path: '/api/test', method: 'POST' }]);
    expect(index.get('B')).toEqual([{ path: '/api/test', method: 'POST' }]);
  });

  it('excludes components used only in responses', async () => {
    const oas = await loadOas(fixturePath('response_only_no_flag', 'current'));
    const index = buildRequestBodyIndex(oas);
    expect(index.has('Body')).toBe(false);
  });

  it('aggregates multiple consumers for the same component', () => {
    const oas: OpenAPISpec = {
      openapi: '3.0.0',
      info: { title: 't', version: '1' },
      paths: {
        '/api/a': {
          post: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Body' } } },
            },
          },
        },
        '/api/b': {
          put: {
            requestBody: {
              content: { 'application/json': { schema: { $ref: '#/components/schemas/Body' } } },
            },
          },
        },
      },
      components: {
        schemas: { Body: { type: 'object' } },
      },
    };
    const index = buildRequestBodyIndex(oas);
    expect(index.get('Body')).toEqual([
      { path: '/api/a', method: 'POST' },
      { path: '/api/b', method: 'PUT' },
    ]);
  });
});
