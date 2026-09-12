/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { extractKibanaApiDocLinks } from './extract_kibana_api_doc_links';

describe('extractKibanaApiDocLinks', () => {
  it('maps path templates to methods and operationIds', () => {
    const oasDocument = {
      paths: {
        '/api/spaces/space/{id}': {
          get: { operationId: 'get-spaces-space-id' },
          put: { operationId: 'put-spaces-space-id' },
        },
        '/api/features': {
          get: { operationId: 'get-features' },
        },
      },
    };

    expect(extractKibanaApiDocLinks(oasDocument)).toEqual({
      '/api/spaces/space/{id}': {
        get: 'get-spaces-space-id',
        put: 'put-spaces-space-id',
      },
      '/api/features': {
        get: 'get-features',
      },
    });
  });

  it('lowercases HTTP methods only from the known set', () => {
    const oasDocument = {
      paths: {
        '/api/features': {
          get: { operationId: 'get-features' },
          // non-HTTP-method keys (e.g. OpenAPI "parameters") are ignored
          parameters: { operationId: 'should-be-ignored' },
        },
      },
    };

    expect(extractKibanaApiDocLinks(oasDocument)).toEqual({
      '/api/features': { get: 'get-features' },
    });
  });

  it('skips operations without an operationId', () => {
    const oasDocument = {
      paths: {
        '/api/features': {
          get: {},
        },
      },
    };

    expect(extractKibanaApiDocLinks(oasDocument)).toEqual({});
  });

  it('returns an empty map when there are no paths', () => {
    expect(extractKibanaApiDocLinks({})).toEqual({});
  });
});
