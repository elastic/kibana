/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const sharedOas = {
  components: {
    schemas: {},
    securitySchemes: {
      apiKeyAuth: {
        in: 'header',
        name: 'Authorization',
        type: 'apiKey',
      },
      basicAuth: {
        scheme: 'basic',
        type: 'http',
      },
    },
  },
  info: {
    title: 'test',
    version: '99.99.99',
  },
  openapi: '3.0.0',
  paths: {
    '/bar': {
      get: {
        deprecated: true,
        operationId: '/bar#0',
        parameters: [
          {
            description: 'The version of the API to use',
            in: 'header',
            name: 'elastic-api-version',
            schema: {
              default: 'oas-test-version-2',
              enum: ['oas-test-version-1', 'oas-test-version-2'],
              type: 'string',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json; Elastic-Api-Version=oas-test-version-1': {
              schema: {
                additionalProperties: false,
                properties: {
                  booleanDefault: {
                    default: true,
                    description: 'defaults to to true',
                    type: 'boolean',
                  },
                  ipType: {
                    format: 'ipv4',
                    type: 'string',
                  },
                  literalType: {
                    enum: ['literallythis'],
                    type: 'string',
                  },
                  maybeNumber: {
                    maximum: 1000,
                    minimum: 1,
                    type: 'number',
                  },
                  record: {
                    additionalProperties: {
                      type: 'string',
                    },
                    type: 'object',
                  },
                  string: {
                    maxLength: 10,
                    minLength: 1,
                    type: 'string',
                  },
                  union: {
                    anyOf: [
                      {
                        description: 'Union string',
                        maxLength: 1,
                        type: 'string',
                      },
                      {
                        description: 'Union number',
                        minimum: 0,
                        type: 'number',
                      },
                    ],
                  },
                  uri: {
                    default: 'prototest://something',
                    format: 'uri',
                    type: 'string',
                  },
                },
                required: ['string', 'ipType', 'literalType', 'record', 'union'],
                type: 'object',
              },
            },
            'application/json; Elastic-Api-Version=oas-test-version-2': {
              schema: {
                additionalProperties: false,
                properties: {
                  foo: {
                    type: 'string',
                  },
                },
                required: ['foo'],
                type: 'object',
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json; Elastic-Api-Version=oas-test-version-1': {
                schema: {
                  additionalProperties: false,
                  description: 'fooResponse',
                  properties: {
                    fooResponseWithDescription: {
                      type: 'string',
                    },
                  },
                  required: ['fooResponseWithDescription'],
                  type: 'object',
                },
              },
              'application/octet-stream; Elastic-Api-Version=oas-test-version-2': {
                schema: {
                  description: 'stream response',
                  type: 'object',
                },
              },
            },
          },
        },
        summary: 'versioned route',
        tags: ['versioned'],
      },
    },
    '/foo/{id}/{path*}': {
      get: {
        description: 'route description',
        operationId: '/foo/{id}/{path*}#0',
        parameters: [
          {
            description: 'The version of the API to use',
            in: 'header',
            name: 'elastic-api-version',
            schema: {
              default: '2023-10-31',
              enum: ['2023-10-31'],
              type: 'string',
            },
          },
          {
            description: 'id',
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              maxLength: 36,
              type: 'string',
            },
          },
          {
            description: 'path',
            in: 'path',
            name: 'path',
            required: true,
            schema: {
              maxLength: 36,
              type: 'string',
            },
          },
          {
            description: 'page',
            in: 'query',
            name: 'page',
            required: false,
            schema: {
              default: 1,
              maximum: 999,
              minimum: 1,
              type: 'number',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json; Elastic-Api-Version=2023-10-31': {
              schema: {
                additionalProperties: false,
                properties: {
                  booleanDefault: {
                    default: true,
                    description: 'defaults to to true',
                    type: 'boolean',
                  },
                  ipType: {
                    format: 'ipv4',
                    type: 'string',
                  },
                  literalType: {
                    enum: ['literallythis'],
                    type: 'string',
                  },
                  maybeNumber: {
                    maximum: 1000,
                    minimum: 1,
                    type: 'number',
                  },
                  record: {
                    additionalProperties: {
                      type: 'string',
                    },
                    type: 'object',
                  },
                  string: {
                    maxLength: 10,
                    minLength: 1,
                    type: 'string',
                  },
                  union: {
                    anyOf: [
                      {
                        description: 'Union string',
                        maxLength: 1,
                        type: 'string',
                      },
                      {
                        description: 'Union number',
                        minimum: 0,
                        type: 'number',
                      },
                    ],
                  },
                  uri: {
                    default: 'prototest://something',
                    format: 'uri',
                    type: 'string',
                  },
                },
                required: ['string', 'ipType', 'literalType', 'record', 'union'],
                type: 'object',
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json; Elastic-Api-Version=2023-10-31': {
                schema: {
                  maxLength: 10,
                  minLength: 1,
                  type: 'string',
                },
              },
            },
          },
        },
        summary: 'route summary',
        tags: ['bar'],
      },
      post: {
        description: 'route description',
        operationId: '/foo/{id}/{path*}#1',
        parameters: [
          {
            description: 'The version of the API to use',
            in: 'header',
            name: 'elastic-api-version',
            schema: {
              default: '2023-10-31',
              enum: ['2023-10-31'],
              type: 'string',
            },
          },
          {
            description: 'id',
            in: 'path',
            name: 'id',
            required: true,
            schema: {
              maxLength: 36,
              type: 'string',
            },
          },
          {
            description: 'path',
            in: 'path',
            name: 'path',
            required: true,
            schema: {
              maxLength: 36,
              type: 'string',
            },
          },
          {
            description: 'page',
            in: 'query',
            name: 'page',
            required: false,
            schema: {
              default: 1,
              maximum: 999,
              minimum: 1,
              type: 'number',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json; Elastic-Api-Version=2023-10-31': {
              schema: {
                additionalProperties: false,
                properties: {
                  booleanDefault: {
                    default: true,
                    description: 'defaults to to true',
                    type: 'boolean',
                  },
                  ipType: {
                    format: 'ipv4',
                    type: 'string',
                  },
                  literalType: {
                    enum: ['literallythis'],
                    type: 'string',
                  },
                  maybeNumber: {
                    maximum: 1000,
                    minimum: 1,
                    type: 'number',
                  },
                  record: {
                    additionalProperties: {
                      type: 'string',
                    },
                    type: 'object',
                  },
                  string: {
                    maxLength: 10,
                    minLength: 1,
                    type: 'string',
                  },
                  union: {
                    anyOf: [
                      {
                        description: 'Union string',
                        maxLength: 1,
                        type: 'string',
                      },
                      {
                        description: 'Union number',
                        minimum: 0,
                        type: 'number',
                      },
                    ],
                  },
                  uri: {
                    default: 'prototest://something',
                    format: 'uri',
                    type: 'string',
                  },
                },
                required: ['string', 'ipType', 'literalType', 'record', 'union'],
                type: 'object',
              },
            },
          },
        },
        responses: {
          '200': {
            content: {
              'application/json; Elastic-Api-Version=2023-10-31': {
                schema: {
                  maxLength: 10,
                  minLength: 1,
                  type: 'string',
                },
              },
            },
          },
        },
        summary: 'route summary',
        tags: ['bar'],
      },
    },
  },
  security: [
    {
      basicAuth: [],
    },
  ],
  servers: [
    {
      url: 'https://test.oas',
    },
  ],
  tags: [
    {
      name: 'bar',
    },
    {
      name: 'versioned',
    },
  ],
};
