/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - skip nodes like internal endpoints', () => {
  it('skips nodes with x-internal property', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        {
                          $ref: '#/components/schemas/TestSchema1',
                        },
                        {
                          $ref: '#/components/schemas/TestSchema2',
                          // @ts-expect-error custom prop
                          'x-internal': true,
                        },
                        {
                          type: 'object',
                          properties: {
                            field1: {
                              type: 'string',
                            },
                            internalField: {
                              'x-internal': true,
                              type: 'string',
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: {
          TestSchema1: {
            type: 'object',
            properties: {
              field1: {
                type: 'string',
                enum: ['value1'],
              },
              field2: {
                type: 'integer',
                minimum: 1,
              },
            },
          },
          TestSchema2: {
            type: 'string',
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            anyOf: [
              {
                $ref: '#/components/schemas/TestSchema1',
              },
              {
                type: 'object',
                properties: {
                  field1: {
                    type: 'string',
                  },
                },
              },
            ],
          },
        },
      },
    });
  });

  it('skips endpoints starting with /internal', async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            operationId: 'TestEndpointGet',
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
      paths: {
        '/internal/some_api': {
          post: {
            operationId: 'TestEndpointPost',
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
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

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(Object.keys(bundledSpec.paths)).not.toContain('/internal/some_api');
  });
});
