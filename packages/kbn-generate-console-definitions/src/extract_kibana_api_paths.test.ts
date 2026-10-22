/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractKibanaApiPaths } from './extract_kibana_api_paths';

describe('extractKibanaApiPaths', () => {
  it('creates one definition per operation with uppercase method and slash-less pattern', () => {
    const oasDocument = {
      paths: {
        '/api/things/{id}': {
          get: { operationId: 'get-things-id' },
          put: { operationId: 'put-things-id' },
        },
      },
    };

    expect(extractKibanaApiPaths(oasDocument)).toEqual({
      'get-things-id': {
        methods: ['GET'],
        patterns: ['api/things/{id}'],
        documentation:
          'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-things-id',
      },
      'put-things-id': {
        methods: ['PUT'],
        patterns: ['api/things/{id}'],
        documentation:
          'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-things-id',
      },
    });
  });

  it('adds query and path parameters, merging the shared and operation ones', () => {
    const oasDocument = {
      components: { parameters: { Id: { name: 'id', in: 'path', schema: { type: 'string' } } } },
      paths: {
        '/api/things/{id}/{color}': {
          parameters: [
            { $ref: '#/components/parameters/Id' },
            { name: 'color', in: 'path', schema: { type: 'string', enum: ['red'] } },
            { name: 'x-header', in: 'header', schema: { type: 'string' } },
          ],
          get: {
            operationId: 'get-thing',
            parameters: [{ name: 'verbose', in: 'query', schema: { type: 'boolean' } }],
          },
        },
      },
    };

    const endpoint = extractKibanaApiPaths(oasDocument)['get-thing'];

    expect(endpoint.url_params).toEqual({ verbose: '__flag__' });
    expect(endpoint.url_components).toEqual({ color: ['red'] });
  });

  it('marks the path params that hold a cluster specific resource', () => {
    const oasDocument = {
      paths: { '/api/spaces/space/{id}': { get: { operationId: 'get-spaces-space-id' } } },
    };

    expect(extractKibanaApiPaths(oasDocument)['get-spaces-space-id'].url_components).toStrictEqual({
      id: '__kibana_space',
    });
  });

  it('adds the JSON request body rules', () => {
    const oasDocument = {
      paths: {
        '/api/things': {
          post: {
            operationId: 'post-things',
            requestBody: {
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { name: { type: 'string' } } },
                },
              },
            },
          },
        },
      },
    };

    expect(extractKibanaApiPaths(oasDocument)['post-things'].data_autocomplete_rules).toEqual({
      name: '',
    });
  });

  it('strips leading and trailing slashes from patterns', () => {
    const oasDocument = {
      paths: { '/api/entities/': { delete: { operationId: 'delete-entities' } } },
    };

    expect(extractKibanaApiPaths(oasDocument)['delete-entities'].patterns).toEqual([
      'api/entities',
    ]);
  });

  it('skips operations without an operationId and unknown methods', () => {
    const oasDocument = {
      paths: {
        '/api/features': { get: {}, trace: { operationId: 'trace-features' } },
      },
    };

    expect(extractKibanaApiPaths(oasDocument)).toEqual({});
  });
});
