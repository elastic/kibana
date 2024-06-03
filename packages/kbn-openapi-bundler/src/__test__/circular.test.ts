/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { dump } from 'js-yaml';
import { OpenAPIV3 } from 'openapi-types';
import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - circular specs', () => {
  it('bundles recursive spec', async () => {
    const recursiveSchema: OpenAPIV3.SchemaObject = {
      type: 'object',
      properties: {
        fieldA: {
          type: 'integer',
        },
      },
    };
    recursiveSchema.properties!.fieldB = recursiveSchema;

    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: recursiveSchema,
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

    expect(dump(bundledSpec.paths['/api/some_api']!.get!.responses['200'])).toMatchInlineSnapshot(`
"content:
  application/json:
    schema: &ref_0
      type: object
      properties:
        fieldA:
          type: integer
        fieldB: *ref_0
description: Successful response
"
`);
  });

  it('bundles specs with recursive references', async () => {
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
                      $ref: './common.schema.yaml#/components/schemas/CircularTestSchema',
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
                      $ref: './common.schema.yaml#/components/schemas/CircularTestSchema',
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
    const commonSpec = createOASDocument({
      info: {
        version: 'not set',
      },
      components: {
        schemas: {
          CircularTestSchema: {
            type: 'object',
            properties: {
              field: {
                $ref: '#/components/schemas/AnotherCircularTestSchema',
              },
            },
          },
          AnotherCircularTestSchema: {
            anyOf: [
              { $ref: '#/components/schemas/CircularTestSchema' },
              { type: 'string', enum: ['value1', 'value2'] },
            ],
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec1,
        2: spec2,
        common: commonSpec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']).toEqual({
      get: expect.objectContaining({
        responses: expect.objectContaining({
          '200': expect.objectContaining({
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CircularTestSchema',
                },
              },
            },
          }),
        }),
      }),
      post: expect.objectContaining({
        responses: expect.objectContaining({
          '200': expect.objectContaining({
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CircularTestSchema',
                },
              },
            },
          }),
        }),
      }),
    });
    expect(bundledSpec.components).toMatchObject({ schemas: commonSpec.components!.schemas });
  });

  it('bundles spec with a self-recursive reference', async () => {
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
                      $ref: '#/components/schemas/CircularTestSchema',
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
          CircularTestSchema: {
            type: 'object',
            properties: {
              field: {
                $ref: '#/components/schemas/CircularTestSchema',
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

    expect(bundledSpec.paths['/api/some_api']).toEqual({
      get: expect.objectContaining({
        responses: expect.objectContaining({
          '200': expect.objectContaining({
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/CircularTestSchema',
                },
              },
            },
          }),
        }),
      }),
    });
    expect(bundledSpec.components!.schemas!.CircularTestSchema).toEqual(
      spec.components!.schemas!.CircularTestSchema
    );
  });
});
