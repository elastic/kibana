/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Router } from '@kbn/core-http-router-server-internal';
import { OasConverter } from './oas_converter';
import { createOperationIdCounter } from './operation_id_counter';
import { extractResponses, processRouter, type InternalRouterRoute } from './process_router';

describe('extractResponses', () => {
  let oasConverter: OasConverter;
  beforeEach(() => {
    oasConverter = new OasConverter();
  });
  test('handles full response config as expected', () => {
    const route: InternalRouterRoute = {
      path: '/foo',
      handler: jest.fn(),
      isVersioned: false,
      method: 'get',
      options: {
        body: { access: ['application/test+json'] } as any,
      },
      validationSchemas: () => ({
        request: {
          body: schema.object({ foo: schema.string() }),
        },
        response: {
          200: {
            bodyContentType: 'application/test+json',
            description: 'OK response',
            body: () => schema.object({ bar: schema.number({ min: 1, max: 99 }) }),
          },
          404: {
            bodyContentType: 'application/test2+json',
            description: 'Not Found response',
            body: () => schema.object({ ok: schema.literal(false) }),
          },
          unsafe: { body: false },
        },
      }),
    };
    expect(extractResponses(route, oasConverter)).toEqual({
      200: {
        description: 'OK response',
        content: {
          'application/test+json; Elastic-Api-Version=2023-10-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                bar: { type: 'number', minimum: 1, maximum: 99 },
              },
              required: ['bar'],
            },
          },
        },
      },
      404: {
        description: 'Not Found response',
        content: {
          'application/test2+json; Elastic-Api-Version=2023-10-31': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                ok: { type: 'boolean', enum: [false] },
              },
              required: ['ok'],
            },
          },
        },
      },
    });
  });
});

describe('processRouter', () => {
  const testRouter = {
    getRoutes: () => [
      {
        path: '/foo',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/bar',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/baz',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
    ],
  } as unknown as Router;

  it('only provides routes for version 2023-10-31', () => {
    const result1 = processRouter(testRouter, new OasConverter(), createOperationIdCounter(), {
      version: '2023-10-31',
    });

    expect(Object.keys(result1.paths!)).toHaveLength(3);

    const result2 = processRouter(testRouter, new OasConverter(), createOperationIdCounter(), {
      version: '2024-10-31',
    });
    expect(Object.keys(result2.paths!)).toHaveLength(0);
  });
});
