/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createOASDocument } from '../create_oas_document';
import { mergeSpecs } from './merge_specs';

describe('OpenAPI Merger - merge paths', () => {
  it('merges path operations', async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/some_api': {
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
    const spec2 = createOASDocument({
      paths: {
        '/api/some_api': {
          post: {
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

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(Object.keys(mergedSpec.paths)).toEqual(['/api/some_api']);

    expect(mergedSpec.paths).toMatchObject({
      '/api/some_api': {
        get: expect.anything(),
        post: expect.anything(),
      },
    });
  });

  // We do not expect to merge different versions of the same endpoint for the foreseeable future. This might change
  // so keeping this test around for now.
  it.skip('merges different versions of the same endpoint', async () => {
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
    const spec2 = createOASDocument({
      info: {
        version: '2024-01-01',
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

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(Object.keys(mergedSpec.paths)).toEqual(['/api/some_api']);

    expect(mergedSpec.paths['/api/some_api']!.get?.responses['200']).toMatchObject({
      content: {
        'application/json; Elastic-Api-Version=2023-10-31': expect.anything(),
        'application/json; Elastic-Api-Version=2024-01-01': expect.anything(),
      },
    });
  });
});
