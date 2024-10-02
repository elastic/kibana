/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - x-modify', () => {
  it('inlines references with x-modify property', async () => {
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
                          $ref: '#/components/schemas/SchemaWithRequiredFields',
                          // @ts-expect-error custom prop
                          'x-modify': 'partial',
                        },
                        {
                          $ref: '#/components/schemas/SchemaWithOptionalFields',
                          'x-modify': 'required',
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
          SchemaWithRequiredFields: {
            type: 'object',
            properties: {
              fieldA: {
                type: 'string',
                enum: ['value1'],
              },
              fieldB: {
                type: 'integer',
                minimum: 1,
              },
            },
            required: ['fieldA', 'fieldB'],
          },
          SchemaWithOptionalFields: {
            type: 'object',
            properties: {
              fieldC: {
                type: 'string',
                enum: ['value1'],
              },
              fieldD: {
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
            anyOf: [
              {
                type: 'object',
                properties: {
                  fieldA: {
                    type: 'string',
                    enum: ['value1'],
                  },
                  fieldB: {
                    type: 'integer',
                    minimum: 1,
                  },
                },
              },
              {
                type: 'object',
                properties: {
                  fieldC: {
                    type: 'string',
                    enum: ['value1'],
                  },
                  fieldD: {
                    type: 'integer',
                    minimum: 1,
                  },
                },
                required: ['fieldC', 'fieldD'],
              },
            ],
          },
        },
      },
    });
  });

  it('makes properties in an object schema node partial', async () => {
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
                      // @ts-expect-error custom prop
                      'x-modify': 'partial',
                      type: 'object',
                      properties: {
                        fieldA: {
                          type: 'string',
                          enum: ['value1'],
                        },
                        fieldB: {
                          type: 'integer',
                          minimum: 1,
                        },
                      },
                      required: ['fieldA', 'fieldB'],
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

    expect(bundledSpec.paths['/api/some_api']!.get!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: expect.not.objectContaining({
            required: expect.anything(),
          }),
        },
      },
    });
  });

  it('makes properties in a referenced object schema node partial', async () => {
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
                      $ref: '#/components/schemas/TestSchema',
                      // @ts-expect-error custom prop
                      'x-modify': 'partial',
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
            type: 'object',
            properties: {
              fieldA: {
                type: 'string',
                enum: ['value1'],
              },
              fieldB: {
                type: 'integer',
                minimum: 1,
              },
            },
            required: ['fieldA', 'fieldB'],
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
          schema: expect.not.objectContaining({
            required: expect.anything(),
          }),
        },
      },
    });
  });

  it('makes properties in an object schema node required', async () => {
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
                      // @ts-expect-error custom prop
                      'x-modify': 'required',
                      type: 'object',
                      properties: {
                        fieldA: {
                          type: 'string',
                          enum: ['value1'],
                        },
                        fieldB: {
                          type: 'integer',
                          minimum: 1,
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

    expect(bundledSpec.paths['/api/some_api']!.get!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: expect.objectContaining({
            required: ['fieldA', 'fieldB'],
          }),
        },
      },
    });
  });

  it('makes properties in a referenced object schema node required', async () => {
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
                      $ref: '#/components/schemas/TestSchema',
                      // @ts-expect-error custom prop
                      'x-modify': 'required',
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
            type: 'object',
            properties: {
              fieldA: {
                type: 'string',
                enum: ['value1'],
              },
              fieldB: {
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
          schema: expect.objectContaining({
            required: ['fieldA', 'fieldB'],
          }),
        },
      },
    });
  });
});
