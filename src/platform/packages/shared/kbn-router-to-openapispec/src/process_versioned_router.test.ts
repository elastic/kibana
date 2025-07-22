/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

jest.mock('./util', () => {
  const module = jest.requireActual('./util');
  return {
    ...module,
    setXState: jest.fn(module.setXState),
  };
});

import { schema } from '@kbn/config-schema';
import type { CoreVersionedRouter } from '@kbn/core-http-router-server-internal';
import { get } from 'lodash';
import { OasConverter } from './oas_converter';
import {
  extractVersionedRequestBodies,
  extractVersionedResponses,
  processVersionedRouter,
} from './process_versioned_router';
import { VersionedRouterRoute } from '@kbn/core-http-server';
import { createOpIdGenerator, setXState } from './util';

let oasConverter: OasConverter;
beforeEach(() => {
  oasConverter = new OasConverter();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('extractVersionedRequestBodies', () => {
  test('handles full request config as expected', () => {
    expect(
      extractVersionedRequestBodies(createInternalTestRoute(), oasConverter, ['application/json'])
    ).toEqual({
      'application/json; Elastic-Api-Version=1': {
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
      'application/json; Elastic-Api-Version=2': {
        schema: {
          additionalProperties: false,
          properties: {
            foo2: {
              type: 'string',
            },
          },
          required: ['foo2'],
          type: 'object',
        },
      },
    });
  });
});

describe('extractVersionedResponses', () => {
  test('handles full response config as expected', () => {
    expect(
      extractVersionedResponses(createInternalTestRoute(), oasConverter, ['application/test+json'])
    ).toEqual({
      200: {
        description: 'OK response 1\nOK response 2', // merge multiple version descriptions
        content: {
          'application/test+json; Elastic-Api-Version=1': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                bar: { type: 'number', minimum: 1, maximum: 99 },
              },
              required: ['bar'],
            },
          },
          'application/test+json; Elastic-Api-Version=2': {
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                bar2: { type: 'number', minimum: 1, maximum: 99 },
              },
              required: ['bar2'],
            },
          },
        },
      },
      404: {
        description: 'Not Found response 1',
        content: {
          'application/test2+json; Elastic-Api-Version=1': {
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
      500: {
        content: {
          'application/test2+json; Elastic-Api-Version=2': {
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

describe('processVersionedRouter', () => {
  it('correctly extracts the version based on the version filter', async () => {
    const baseCase = await processVersionedRouter({
      appRouter: { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter,
      converter: new OasConverter(),
      getOpId: createOpIdGenerator(),
      filters: { access: 'public', version: '2023-10-31' },
    });

    expect(Object.keys(get(baseCase, 'paths["/foo"].get.responses.200.content')!)).toEqual([
      'application/test+json',
    ]);

    const filteredCase = await processVersionedRouter({
      appRouter: { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter,
      converter: new OasConverter(),
      getOpId: createOpIdGenerator(),
      filters: { version: '2024-12-31', access: 'public' },
    });
    expect(Object.keys(get(filteredCase, 'paths["/foo"].get.responses.200.content')!)).toEqual([
      'application/test+json',
    ]);
  });

  it('correctly updates the authz description for routes that require privileges', async () => {
    const results = await processVersionedRouter({
      appRouter: { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter,
      converter: new OasConverter(),
      getOpId: createOpIdGenerator(),
      filters: { version: '2023-10-31', access: 'public' },
    });
    expect(results.paths['/foo']).toBeDefined();

    expect(results.paths['/foo']!.get).toBeDefined();

    expect(results.paths['/foo']!.get!.description).toBe(
      'This is a test route description.<br/><br/>[Required authorization] Route required privileges: manage_spaces.'
    );
  });

  it('calls setXState with correct arguments', async () => {
    const testRouter = { getRoutes: () => [createTestRoute()] } as unknown as CoreVersionedRouter;
    await processVersionedRouter({
      appRouter: testRouter,
      converter: new OasConverter(),
      getOpId: createOpIdGenerator(),
      filters: {
        version: '2023-10-31',
        access: 'public',
      },
      env: { serverless: true },
    });

    const routes = testRouter.getRoutes();
    expect(setXState).toHaveBeenCalledTimes(routes.length);
    routes.forEach((_, idx) => {
      const [availability, operation, env] = (setXState as jest.Mock).mock.calls[idx];
      expect(availability === undefined || typeof availability === 'object').toBe(true);
      expect(typeof operation === 'object').toBe(true);
      expect(env).toEqual({ serverless: true });
    });
  });
});

const createTestRoute: () => VersionedRouterRoute = () => ({
  path: '/foo',
  method: 'get',
  isVersioned: true,
  options: {
    access: 'public',
    deprecated: true,
    discontinued: 'discontinued versioned router',
    options: { body: { access: ['application/test+json'] } as any },
    security: {
      authz: {
        requiredPrivileges: ['manage_spaces'],
      },
    },
    description: 'This is a test route description.',
  },
  handlers: [
    {
      fn: jest.fn(),
      options: {
        version: '2023-10-31',
        validate: () => ({
          request: {
            body: schema.object({ foo: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 2023-10-31',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar: schema.number({ min: 1, max: 99 }) }),
            },
            404: {
              description: 'Not Found response 2023-10-31',
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
    {
      fn: jest.fn(),
      options: {
        version: '2024-12-31',
        validate: () => ({
          request: {
            body: schema.object({ foo2: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 2024-12-31',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar2: schema.number({ min: 1, max: 99 }) }),
            },
            500: {
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
  ],
});

const createInternalTestRoute: () => VersionedRouterRoute = () => ({
  path: '/foo',
  method: 'get',
  isVersioned: true,
  options: {
    access: 'internal',
    deprecated: true,
    discontinued: 'discontinued versioned router',
    options: { body: { access: ['application/test+json'] } as any },
    security: {
      authz: {
        requiredPrivileges: ['manage_spaces'],
      },
    },
    description: 'This is a test route description.',
  },
  handlers: [
    {
      fn: jest.fn(),
      options: {
        version: '1',
        validate: () => ({
          request: {
            body: schema.object({ foo: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 1',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar: schema.number({ min: 1, max: 99 }) }),
            },
            404: {
              description: 'Not Found response 1',
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
    {
      fn: jest.fn(),
      options: {
        version: '2',
        validate: () => ({
          request: {
            body: schema.object({ foo2: schema.string() }),
          },
          response: {
            200: {
              description: 'OK response 2',
              bodyContentType: 'application/test+json',
              body: () => schema.object({ bar2: schema.number({ min: 1, max: 99 }) }),
            },
            500: {
              bodyContentType: 'application/test2+json',
              body: () => schema.object({ ok: schema.literal(false) }),
            },
            unsafe: { body: false },
          },
        }),
      },
    },
  ],
});
