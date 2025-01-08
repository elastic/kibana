/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenAPIV3 } from 'openapi-types';
import { bundleSpecs } from './bundle_specs';
import { createOASDocument } from '../create_oas_document';

describe('OpenAPI Bundler - bundle references', () => {
  it('bundles files with external references', async () => {
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
                      $ref: './common.schema.yaml#/components/schemas/TestSchema',
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
                      $ref: './common.schema.yaml#/components/schemas/TestSchema',
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
          TestSchema: {
            type: 'string',
            enum: ['value1', 'value2'],
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

    expect(bundledSpec.paths['/api/some_api']!.get!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TestSchema',
          },
        },
      },
    });
    expect(bundledSpec.paths['/api/some_api']!.post!.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/TestSchema',
          },
        },
      },
    });
    expect(bundledSpec.components!.schemas).toMatchObject({
      TestSchema: commonSpec.components!.schemas!.TestSchema,
    });
  });

  it('bundles one file with a local reference', async () => {
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

    expect(bundledSpec.paths['/api/some_api']).toEqual({
      get: expect.objectContaining({
        responses: expect.objectContaining({
          '200': expect.objectContaining({
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/TestSchema',
                },
              },
            },
          }),
        }),
      }),
    });
    expect(bundledSpec.components!.schemas!.TestSchema).toEqual(
      spec.components!.schemas!.TestSchema
    );
  });

  it('bundles one file with an external reference', async () => {
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
                      $ref: './common.schema.yaml#/components/schemas/TestSchema',
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
                  $ref: '#/components/schemas/TestSchema',
                },
              },
            },
          }),
        }),
      }),
    });
    expect(bundledSpec.components!.schemas!.TestSchema).toMatchObject(
      commonSpec.components!.schemas!.TestSchema
    );
  });

  it('bundles conflicting but equal references', async () => {
    const ConflictTestSchema: OpenAPIV3.SchemaObject = {
      type: 'integer',
      minimum: 1,
    };
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
                      $ref: '#/components/schemas/ConflictTestSchema',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: { ConflictTestSchema },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/some_api': {
          put: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ConflictTestSchema',
                    },
                  },
                },
              },
            },
          },
        },
      },
      components: {
        schemas: { ConflictTestSchema },
      },
    });

    const [bundledSpec] = Object.values(await bundleSpecs({ '1': spec1, '2': spec2 }));

    expect(bundledSpec.paths['/api/some_api']).toEqual({
      get: spec1.paths['/api/some_api']!.get,
      put: spec2.paths['/api/some_api']!.put,
    });
    expect(bundledSpec.components).toMatchObject({ schemas: { ConflictTestSchema } });
  });

  it('DOES NOT bundle external conflicting references encountered in on spec file', async () => {
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
                      type: 'object',
                      properties: {
                        fieldA: {
                          $ref: './common_a.schema.yaml#/components/schemas/ConflictTestSchema',
                        },
                        fieldB: {
                          $ref: './common_b.schema.yaml#/components/schemas/ConflictTestSchema',
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
    const commonSpecA = createOASDocument({
      components: {
        schemas: {
          ConflictTestSchema: {
            type: 'string',
            enum: ['value1', 'value2'],
          },
        },
      },
    });
    const commonSpecB = createOASDocument({
      components: {
        schemas: {
          ConflictTestSchema: {
            type: 'object',
            properties: {
              someField: {
                type: 'string',
              },
            },
          },
        },
      },
    });

    await expect(
      bundleSpecs({
        1: spec,
        common_a: commonSpecA,
        common_b: commonSpecB,
      })
    ).rejects.toThrowError(/\/components\/schemas\/ConflictTestSchema/);
  });

  it('DOES NOT bundle conflicting references encountered in separate specs', async () => {
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
                      $ref: '#/components/schemas/ConflictTestSchema',
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
          ConflictTestSchema: {
            type: 'string',
            enum: ['value1', 'value2'],
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/some_api': {
          put: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/ConflictTestSchema',
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
          ConflictTestSchema: {
            type: 'integer',
            minimum: 1,
          },
        },
      },
    });

    await expect(
      bundleSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError(/\/components\/schemas\/ConflictTestSchema/);
  });
});
