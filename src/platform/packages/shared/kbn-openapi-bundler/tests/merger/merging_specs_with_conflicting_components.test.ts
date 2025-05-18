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

// Disable naming convention check due to tests on spec title prefixes
// like Spec1_Something which violates that rule
/* eslint-disable @typescript-eslint/naming-convention */

describe('OpenAPI Merger - merging specs with conflicting components', () => {
  it('prefixes schemas component names for each source spec ', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
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
                      $ref: '#/components/schemas/SomeSchema',
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
          SomeSchema: {
            type: 'string',
          },
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/some_api': {
          post: {
            responses: {
              '200': {
                description: 'Successful response',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/SomeSchema',
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
          SomeSchema: {
            type: 'string',
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

    expect(mergedSpec.paths['/api/some_api']?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Spec1_SomeSchema',
          },
        },
      },
    });
    expect(mergedSpec.paths['/api/some_api']?.post?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: {
            $ref: '#/components/schemas/Spec2_SomeSchema',
          },
        },
      },
    });
    expect(mergedSpec.components?.schemas).toMatchObject({
      Spec1_SomeSchema: expect.anything(),
      Spec2_SomeSchema: expect.anything(),
    });
  });

  it('prefixes responses component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                $ref: '#/components/responses/GetResponse',
              },
            },
          },
        },
      },
      components: {
        responses: {
          GetResponse: {
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
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/some_api': {
          post: {
            responses: {
              '200': {
                $ref: '#/components/responses/PostResponse',
              },
            },
          },
        },
      },
      components: {
        responses: {
          PostResponse: {
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
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.get?.responses['200']).toMatchObject({
      $ref: '#/components/responses/Spec1_GetResponse',
    });
    expect(mergedSpec.paths['/api/some_api']?.post?.responses['200']).toMatchObject({
      $ref: '#/components/responses/Spec2_PostResponse',
    });
    expect(mergedSpec.components?.responses).toMatchObject({
      Spec1_GetResponse: expect.anything(),
      Spec2_PostResponse: expect.anything(),
    });
  });

  it('prefixes parameters component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api/{id}': {
          parameters: [
            {
              $ref: '#/components/parameters/SomeApiIdParam',
            },
          ],
          get: {
            responses: {},
          },
        },
      },
      components: {
        parameters: {
          SomeApiIdParam: {
            name: 'id',
            in: 'path',
          },
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api/{id}': {
          get: {
            parameters: [
              {
                $ref: '#/components/parameters/AnotherApiIdParam',
              },
            ],
            responses: {},
          },
        },
      },
      components: {
        parameters: {
          AnotherApiIdParam: {
            name: 'id',
            in: 'path',
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

    expect(mergedSpec.paths['/api/some_api/{id}']?.parameters).toEqual([
      {
        $ref: '#/components/parameters/Spec1_SomeApiIdParam',
      },
    ]);
    expect(mergedSpec.paths['/api/another_api/{id}']?.get?.parameters).toEqual([
      {
        $ref: '#/components/parameters/Spec2_AnotherApiIdParam',
      },
    ]);
    expect(mergedSpec.components?.parameters).toMatchObject({
      Spec1_SomeApiIdParam: expect.anything(),
      Spec2_AnotherApiIdParam: expect.anything(),
    });
  });

  it('prefixes request bodies component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          post: {
            requestBody: {
              $ref: '#/components/requestBodies/SomeApiRequestBody',
            },
            responses: {},
          },
        },
      },
      components: {
        requestBodies: {
          SomeApiRequestBody: {
            content: {},
          },
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          post: {
            requestBody: {
              $ref: '#/components/requestBodies/AnotherApiRequestBody',
            },
            responses: {},
          },
        },
      },
      components: {
        requestBodies: {
          AnotherApiRequestBody: {
            content: {},
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

    expect(mergedSpec.paths['/api/some_api']?.post?.requestBody).toMatchObject({
      $ref: '#/components/requestBodies/Spec1_SomeApiRequestBody',
    });
    expect(mergedSpec.paths['/api/another_api']?.post?.requestBody).toMatchObject({
      $ref: '#/components/requestBodies/Spec2_AnotherApiRequestBody',
    });
    expect(mergedSpec.components?.requestBodies).toMatchObject({
      Spec1_SomeApiRequestBody: expect.anything(),
      Spec2_AnotherApiRequestBody: expect.anything(),
    });
  });

  it('prefixes examples component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              example: { $ref: '#/components/examples/SomeApiGetResponseExample' },
            },
          },
        },
      },
      components: {
        examples: {
          SomeApiGetResponseExample: {},
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          get: {
            responses: {
              example: { $ref: '#/components/examples/AnotherApiGetResponseExample' },
            },
          },
        },
      },
      components: {
        examples: {
          AnotherApiGetResponseExample: {},
        },
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.get?.responses.example).toMatchObject({
      $ref: '#/components/examples/Spec1_SomeApiGetResponseExample',
    });
    expect(mergedSpec.paths['/api/another_api']?.get?.responses.example).toMatchObject({
      $ref: '#/components/examples/Spec2_AnotherApiGetResponseExample',
    });
    expect(mergedSpec.components?.examples).toMatchObject({
      Spec1_SomeApiGetResponseExample: expect.anything(),
      Spec2_AnotherApiGetResponseExample: expect.anything(),
    });
  });

  it('prefixes headers component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          post: {
            requestBody: {
              content: {
                'application/json': {
                  encoding: {
                    something: {
                      headers: {
                        'x-request-header': {
                          $ref: '#/components/headers/SomeApiRequestHeader',
                        },
                      },
                    },
                  },
                },
              },
            },
            responses: {},
          },
        },
      },
      components: {
        headers: {
          SomeApiRequestHeader: {},
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                headers: {
                  'x-response-header': {
                    $ref: '#/components/headers/AnotherApiResponseHeader',
                  },
                },
              },
            },
          },
        },
      },
      components: {
        headers: {
          AnotherApiResponseHeader: {},
        },
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.post?.requestBody).toMatchObject({
      content: {
        'application/json': {
          encoding: {
            something: {
              headers: {
                'x-request-header': {
                  $ref: '#/components/headers/Spec1_SomeApiRequestHeader',
                },
              },
            },
          },
        },
      },
    });
    expect(mergedSpec.paths['/api/another_api']?.get?.responses['200']).toMatchObject({
      headers: {
        'x-response-header': {
          $ref: '#/components/headers/Spec2_AnotherApiResponseHeader',
        },
      },
    });
    expect(mergedSpec.components?.headers).toMatchObject({
      Spec1_SomeApiRequestHeader: expect.anything(),
      Spec2_AnotherApiResponseHeader: expect.anything(),
    });
  });

  it('prefixes security schemes component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      security: [
        {
          SomeApiAuth: [],
        },
      ],
      paths: {
        '/api/some_api': {
          get: {
            responses: {},
          },
        },
      },
      components: {
        securitySchemes: {
          SomeApiAuth: {
            type: 'http',
            scheme: 'Basic',
          },
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          get: {
            security: [
              {
                AnotherApiAuth: [],
              },
            ],
            responses: {},
          },
        },
      },
      components: {
        securitySchemes: {
          AnotherApiAuth: {
            type: 'http',
            scheme: 'Basic',
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

    expect(mergedSpec.security).toEqual(
      expect.arrayContaining([
        {
          Spec1_SomeApiAuth: [],
        },
      ])
    );
    expect(mergedSpec.paths['/api/another_api']?.get?.security).toEqual([
      {
        Spec2_AnotherApiAuth: [],
      },
    ]);
    expect(mergedSpec.components?.securitySchemes).toMatchObject({
      Spec1_SomeApiAuth: expect.anything(),
      Spec2_AnotherApiAuth: expect.anything(),
    });
  });

  it('prefixes links component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                links: {
                  SomeLink: {
                    $ref: '#/components/links/SomeLink',
                  },
                },
              },
            },
          },
        },
      },
      components: {
        links: {
          SomeLink: {},
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          get: {
            responses: {
              '200': {
                description: 'Successful response',
                links: {
                  SomeLink: {
                    $ref: '#/components/links/SomeLink',
                  },
                },
              },
            },
          },
        },
      },
      components: {
        links: {
          SomeLink: {},
        },
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.get?.responses['200']).toMatchObject({
      links: {
        SomeLink: {
          $ref: '#/components/links/Spec1_SomeLink',
        },
      },
    });
    expect(mergedSpec.paths['/api/another_api']?.get?.responses['200']).toMatchObject({
      links: {
        SomeLink: {
          $ref: '#/components/links/Spec2_SomeLink',
        },
      },
    });
    expect(mergedSpec.components?.links).toMatchObject({
      Spec1_SomeLink: expect.anything(),
      Spec2_SomeLink: expect.anything(),
    });
  });

  it('prefixes callbacks component names for each source spec', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
      },
      paths: {
        '/api/some_api': {
          get: {
            responses: {},
            callbacks: {
              SomeCallback: {
                $ref: '#/components/callbacks/SomeCallback',
              },
            },
          },
        },
      },
      components: {
        callbacks: {
          SomeCallback: {},
        },
      },
    });
    const spec2 = createOASDocument({
      info: {
        title: 'Spec2',
      },
      paths: {
        '/api/another_api': {
          get: {
            responses: {},
            callbacks: {
              SomeCallback: {
                $ref: '#/components/callbacks/SomeCallback',
              },
            },
          },
        },
      },
      components: {
        callbacks: {
          SomeCallback: {},
        },
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
        2: spec2,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.get?.callbacks).toMatchObject({
      SomeCallback: {
        $ref: '#/components/callbacks/Spec1_SomeCallback',
      },
    });
    expect(mergedSpec.paths['/api/another_api']?.get?.callbacks).toMatchObject({
      SomeCallback: {
        $ref: '#/components/callbacks/Spec2_SomeCallback',
      },
    });
    expect(mergedSpec.components?.callbacks).toMatchObject({
      Spec1_SomeCallback: expect.anything(),
      Spec2_SomeCallback: expect.anything(),
    });
  });

  it('prefixes discriminator mapping local references', async () => {
    const spec1 = createOASDocument({
      info: {
        title: 'Spec1',
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
                      oneOf: [
                        { $ref: '#/components/schemas/Component1' },
                        { $ref: '#/components/schemas/Component2' },
                      ],
                      discriminator: {
                        propertyName: 'commonProp',
                        mapping: {
                          component1: '#/components/schemas/Component1',
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
      components: {
        schemas: {
          Component1: {
            type: 'object',
            properties: {
              commonProp: {
                type: 'string',
              },
              extraProp1: {
                type: 'boolean',
              },
            },
          },
          Component2: {
            type: 'object',
            properties: {
              commonProp: {
                type: 'string',
              },
              extraProp2: {
                type: 'integer',
              },
            },
          },
        },
      },
    });

    const [mergedSpec] = Object.values(
      await mergeSpecs({
        1: spec1,
      })
    );

    expect(mergedSpec.paths['/api/some_api']?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: expect.objectContaining({
            discriminator: expect.objectContaining({
              mapping: {
                component1: '#/components/schemas/Spec1_Component1',
              },
            }),
          }),
        },
      },
    });
    expect(mergedSpec.components?.schemas).toMatchObject({
      Spec1_Component1: expect.anything(),
    });
  });
});
