/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from './create_oas_document';

describe('OpenAPI Bundler - omit unused schemas', () => {
  it('omits unused local schema', async () => {
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
                      type: 'string',
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
          TestSchema: {
            type: 'string',
            enum: ['value1', 'value2'],
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
      })
    );

    expect(bundledSpec.components).not.toMatchObject({ schemas: expect.anything() });
  });

  it('omits unused external schema', async () => {
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
                      $ref: './common.schema.yaml#/components/schemas/SchemaA',
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
          TestSchema: {
            type: 'string',
            enum: ['value1', 'value2'],
          },
        },
      },
    });
    const commonSpec = createOASDocument({
      components: {
        schemas: {
          SchemaA: {
            type: 'number',
          },
          SchemaB: {
            type: 'string',
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
        common: commonSpec,
      })
    );

    expect(bundledSpec.components!.schemas).toEqual({ SchemaA: expect.anything() });
  });

  it('omits inlined schemas', async () => {
    const spec = createOASDocument({
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: { $ref: './common.schema.yaml#/components/schemas/SchemaToInline' },
                  },
                },
              },
            },
          },
        },
      },
    });
    const commonSpec = createOASDocument({
      components: {
        schemas: {
          SchemaToInline: {
            // @ts-expect-error custom prop
            'x-inline': true,
            type: 'string',
          },
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
        common: commonSpec,
      })
    );

    expect(bundledSpec.components).not.toMatchObject({ schemas: expect.anything() });
  });
});
