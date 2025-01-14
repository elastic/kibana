/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { OpenAPIV3 } from 'openapi-types';
import { createOASDocument } from '../create_oas_document';
import { mergeSpecs } from './merge_specs';

describe('OpenAPI Merger - unresolvable operation object conflicts', () => {
  it.each([
    [
      'tags',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              tags: ['tag1'],
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              tags: ['tag2'],
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'summary',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              summary: 'Summary A',
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              summary: 'Summary B',
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'description',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              description: 'Description A',
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              description: 'Description B',
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'operationId',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              operationId: 'EndpointA',
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              operationId: 'EndpointB',
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'parameters',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              parameters: [
                {
                  name: 'param1',
                  in: 'path',
                },
              ],
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              parameters: [
                {
                  name: 'param1',
                  in: 'path',
                  required: true,
                },
              ],
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'callbacks',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              callbacks: {
                callback1: {
                  responses: {},
                },
              },
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              callbacks: {
                callback2: {
                  responses: {},
                },
              },
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'deprecation status',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              deprecated: true,
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'security requirements',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              security: [
                {
                  securityRequirement: [],
                },
              ],
              responses: {},
            },
          },
        },
      }),
    ],
    [
      'servers',
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              responses: {},
            },
          },
        },
      }),
      createOASDocument({
        paths: {
          '/api/my/endpoint': {
            get: {
              servers: [
                {
                  url: '/some/url',
                },
              ],
              responses: {},
            },
          },
        },
      }),
    ],
  ])('throws an error when operations %s do not match', async (_, spec1, spec2) => {
    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError('"Operation objects are incompatible"');
  });

  it("throws an error when operation's request body has a top level $ref", async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          get: {
            responses: {},
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          get: {
            requestBody: {
              $ref: '#/components/requestBodies/SomeRequestBody',
            },
            responses: {},
          },
        },
      },
      components: {
        requestBodies: {
          SomeRequestBody: {} as OpenAPIV3.RequestBodyObject,
        },
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError('Request body top level $ref is not supported');
  });

  it("throws an error when one of operation's responses has a top level $ref", async () => {
    const spec1 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          get: {
            responses: {},
          },
        },
      },
    });
    const spec2 = createOASDocument({
      paths: {
        '/api/my/endpoint': {
          get: {
            responses: {
              200: {
                $ref: '#/components/responses/SomeResponse',
              },
            },
          },
        },
      },
      components: {
        responses: {
          SomeResponse: {} as OpenAPIV3.ResponseObject,
        },
      },
    });

    expect(
      mergeSpecs({
        1: spec1,
        2: spec2,
      })
    ).rejects.toThrowError('Response object top level $ref is not supported');
  });
});
