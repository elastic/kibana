/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - include labeled operations', () => {
  it('includes Serverless endpoints', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['serverless'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          post: {
            'x-labels': ['ess'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/another_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['ess'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['serverless'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        get: expect.objectContaining({}),
      },
    });
  });

  it('includes ESS endpoints', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom property is unexpected here
            'x-labels': ['serverless'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
          post: {
            'x-labels': ['ess'],
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
        '/api/another_api': {
          // @ts-expect-error custom property is unexpected here
          'x-labels': ['ess'],
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs(
        {
          1: spec,
        },
        {
          includeLabels: ['ess'],
        }
      )
    );

    expect(bundledSpec.paths).toEqual({
      '/api/some_api': {
        post: expect.objectContaining({}),
      },
      '/api/another_api': {
        get: expect.objectContaining({}),
      },
    });
  });
});
