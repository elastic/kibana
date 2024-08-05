/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { OpenAPIV3 } from 'openapi-types';
import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - remove custom x- props', () => {
  it('removes "x-codegen-enabled" property', async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            // @ts-expect-error custom prop
            'x-codegen-enabled': true,
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
        '/api/some_api': {
          post: {
            // @ts-expect-error custom prop
            'x-codegen-enabled': false,
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
    const spec3 = createOASDocument({
      paths: {
        '/api/some_api': {
          put: {
            // @ts-expect-error custom prop
            'x-codegen-enabled': undefined,
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
        3: spec3,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get).not.toMatchObject({
      'x-codegen-enabled': expect.anything(),
    });
    expect(bundledSpec.paths['/api/some_api']!.post).not.toMatchObject({
      'x-codegen-enabled': expect.anything(),
    });
    expect(bundledSpec.paths['/api/some_api']!.put).not.toMatchObject({
      'x-codegen-enabled': expect.anything(),
    });
  });

  it('removes "x-inline" property', async () => {
    const spec = createOASDocument({
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
                      $ref: '#/components/schemas/SchemaToInline',
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
          SchemaToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
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

    const bundledSchema = (
      bundledSpec.paths['/api/some_api']!.get?.responses['200'] as OpenAPIV3.ResponseObject
    ).content!['application/json'].schema;

    expect(bundledSchema).not.toMatchObject({
      'x-inline': expect.anything(),
    });
  });

  it('removes "x-modify" property', async () => {
    const spec = createOASDocument({
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
                      // @ts-expect-error custom prop
                      'x-modify': 'required',
                      type: 'object',
                      properties: {
                        field1: {
                          type: 'string',
                        },
                        field2: {
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

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    const bundledSchema = (
      bundledSpec.paths['/api/some_api']!.get?.responses['200'] as OpenAPIV3.ResponseObject
    ).content!['application/json'].schema;

    expect(bundledSchema).not.toMatchObject({
      'x-modify': expect.anything(),
    });
  });
});
