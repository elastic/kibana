/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - different API versions', () => {
  it('bundles one endpoint with different versions', async () => {
    const spec1 = createOASDocument({
      info: {
        version: '2023-10-31',
      },
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        field1: {
                          type: 'integer',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        version: '2023-11-11',
      },
      paths: {
        '/api/some_api': {
          put: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        field1: {
                          type: 'integer',
                        },
                        field2: {
                          type: 'string',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const bundledSpecs = await bundleSpecs({
      1: spec1,
      2: spec2,
    });

    expect(bundledSpecs).toEqual({
      '2023_10_31.yaml': expect.objectContaining({
        paths: spec1.paths,
      }),
      '2023_11_11.yaml': expect.objectContaining({
        paths: spec2.paths,
      }),
    });
  });
});
