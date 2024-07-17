/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - inline references', () => {
  it('inlines local references', async () => {
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
                        { $ref: '#/components/schemas/SchemaToInline' },
                        { $ref: '#/components/schemas/SchemaNotToInline1' },
                        { $ref: '#/components/schemas/SchemaNotToInline2' },
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
          SchemaToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
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
          SchemaNotToInline1: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': false,
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
          SchemaNotToInline2: {
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
            anyOf: expect.arrayContaining([
              {
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
            ]),
          },
        },
      },
    });
    expect(Object.keys(bundledSpec.components!.schemas!)).toEqual([
      'SchemaNotToInline1',
      'SchemaNotToInline2',
    ]);
  });

  it('inlines external references', async () => {
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
                        { $ref: './common.schema.yaml#/components/schemas/SchemaToInline' },
                        { $ref: './common.schema.yaml#/components/schemas/SchemaNotToInline1' },
                        { $ref: './common.schema.yaml#/components/schemas/SchemaNotToInline2' },
                      ],
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
      components: {
        schemas: {
          SchemaToInline: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': true,
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
          SchemaNotToInline1: {
            // @ts-expect-error OpenAPIV3.Document doesn't allow to add custom props to components.schemas
            'x-inline': false,
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
          SchemaNotToInline2: {
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
        },
      },
    });

    const [bundledSpec] = Object.values(
      await bundleSpecs({
        1: spec,
        common: commonSpec,
      })
    );

    expect(bundledSpec.paths['/api/some_api']!.get!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            anyOf: expect.arrayContaining([
              {
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
            ]),
          },
        },
      },
    });
  });
});
