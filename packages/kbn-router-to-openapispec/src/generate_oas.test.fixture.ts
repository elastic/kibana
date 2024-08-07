/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from 'zod';
import { schema } from '@kbn/config-schema';

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
        operationId: '%2Fbar#0',
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
            description: 'OK response oas-test-version-1\nOK response oas-test-version-2',
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
        operationId: '%2Ffoo%2F%7Bid%7D%2F%7Bpath*%7D#0',
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
        operationId: '%2Ffoo%2F%7Bid%7D%2F%7Bpath*%7D#1',
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
            description: 'A required header to protect against CSRF attacks',
            in: 'header',
            name: 'kbn-xsrf',
            required: true,
            schema: {
              example: 'true',
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

export function createSharedConfigSchema() {
  return schema.object({
    string: schema.string({ maxLength: 10, minLength: 1 }),
    maybeNumber: schema.maybe(schema.number({ max: 1000, min: 1 })),
    booleanDefault: schema.boolean({
      defaultValue: true,
      meta: {
        description: 'defaults to to true',
      },
    }),
    ipType: schema.ip({ versions: ['ipv4'] }),
    literalType: schema.literal('literallythis'),
    record: schema.recordOf(schema.string(), schema.string()),
    union: schema.oneOf([
      schema.string({ maxLength: 1, meta: { description: 'Union string' } }),
      schema.number({ min: 0, meta: { description: 'Union number' } }),
    ]),
    uri: schema.uri({
      scheme: ['prototest'],
      defaultValue: () => 'prototest://something',
    }),
  });
}

export function createSharedZodSchema() {
  return z.object({
    string: z.string().max(10).min(1),
    maybeNumber: z.number().max(1000).min(1).optional(),
    booleanDefault: z.boolean({ description: 'defaults to to true' }).default(true),
    ipType: z.string().ip({ version: 'v4' }),
    literalType: z.literal('literallythis'),
    record: z.record(z.string(), z.string()),
    union: z.union([
      z.string({ description: 'Union string' }).max(1),
      z.number({ description: 'Union number' }).min(0),
    ]),
    uri: z.string().url().default('prototest://something'),
  });
}
