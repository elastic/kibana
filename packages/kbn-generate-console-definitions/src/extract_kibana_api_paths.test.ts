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
        '/api/spaces/space/{id}': {
          get: { operationId: 'get-spaces-space-id' },
          put: { operationId: 'put-spaces-space-id' },
        },
      },
    };

    expect(extractKibanaApiPaths(oasDocument)).toEqual({
      'get-spaces-space-id': {
        methods: ['GET'],
        patterns: ['api/spaces/space/{id}'],
        documentation:
          'https://www.elastic.co/docs/api/doc/kibana/operation/operation-get-spaces-space-id',
      },
      'put-spaces-space-id': {
        methods: ['PUT'],
        patterns: ['api/spaces/space/{id}'],
        documentation:
          'https://www.elastic.co/docs/api/doc/kibana/operation/operation-put-spaces-space-id',
      },
    });
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
