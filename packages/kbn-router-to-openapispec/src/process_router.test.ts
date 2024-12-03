/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { Router } from '@kbn/core-http-router-server-internal';
import { OasConverter } from './oas_converter';
import { extractResponses, processRouter } from './process_router';
import { type InternalRouterRoute } from './type';
import { createOpIdGenerator } from './util';

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
        method: 'get',
        path: '/foo',
        options: { access: 'internal', deprecated: true, discontinued: 'discontinued router' },
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        method: 'get',
        path: '/bar',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        method: 'get',
        path: '/baz',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
      },
      {
        path: '/qux',
        method: 'post',
        options: {},
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
        security: {
          authz: {
            requiredPrivileges: [
              'manage_spaces',
              {
                allRequired: ['taskmanager'],
                anyRequired: ['console'],
              },
            ],
          },
        },
      },
      {
        path: '/quux',
        method: 'post',
        options: {
          description: 'This a test route description.',
        },
        handler: jest.fn(),
        validationSchemas: { request: { body: schema.object({}) } },
        security: {
          authz: {
            requiredPrivileges: [
              'manage_spaces',
              {
                allRequired: ['taskmanager'],
                anyRequired: ['console'],
              },
            ],
          },
        },
      },
    ],
  } as unknown as Router;

  it('only provides routes for version 2023-10-31', () => {
    const result1 = processRouter(testRouter, new OasConverter(), createOpIdGenerator(), {
      version: '2023-10-31',
    });

    expect(Object.keys(result1.paths!)).toHaveLength(5);

    const result2 = processRouter(testRouter, new OasConverter(), createOpIdGenerator(), {
      version: '2024-10-31',
    });
    expect(Object.keys(result2.paths!)).toHaveLength(0);
  });

  it('updates description with privileges required', () => {
    const result = processRouter(testRouter, new OasConverter(), createOpIdGenerator(), {
      version: '2023-10-31',
    });

    expect(result.paths['/qux']?.post).toBeDefined();

    expect(result.paths['/qux']?.post?.description).toEqual(
      '[Required authorization] Route required privileges: ALL of [manage_spaces, taskmanager] AND ANY of [console].'
    );

    expect(result.paths['/quux']?.post?.description).toEqual(
      'This a test route description.<br/><br/>[Required authorization] Route required privileges: ALL of [manage_spaces, taskmanager] AND ANY of [console].'
    );
  });
});
