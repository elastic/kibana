/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { z } from 'zod';
import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';

/** Intended to cover a wide set of schema configurations */
export const testSchema = z.object({
  string: z.string().max(10).min(1),
  maybeNumber: z.number().max(1000).min(1).optional(),
  booleanDefault: z.boolean({ description: 'defaults to to true' }).default(true),
  ipType: z.string().ip({ version: 'v4' }),
  literalType: z.literal('literallythis'),
  neverType: z.never(),
  map: z.record(z.string(), z.string()),
  union: z.array(
    z.string({ description: 'Union string' }).max(1),
    z.number({ description: 'Union number' }).min(0)
  ),
  uri: z.string().url().default('prototest://something'),
  any: z.any({ description: 'any type' }),
});

type RoutesMeta = ReturnType<Router['getRoutes']>[number];
type VersionedRoutesMeta = ReturnType<CoreVersionedRouter['getRoutes']>[number];

export const createRouterForZod = (args: { routes: RoutesMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as Router;
};
export const createVersionedRouterForZod = (args: { routes: VersionedRoutesMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as CoreVersionedRouter;
};

export const getRouterDefaults = (bodySchema: any) => ({
  isVersioned: false,
  path: '/foo/{id}/{path*}',
  method: 'get',
  options: {
    tags: ['foo', 'oas-tag:bar'],
    summary: 'route summary',
    description: 'route description',
  },
  validationSchemas: {
    request: {
      params: z.object({
        id: z.string({ description: 'id' }).max(36),
        path: z.string({ description: 'path' }).max(36),
      }),
      query: z.object({
        page: z.number({ description: 'page' }).max(999).min(1).default(1),
      }),
      body: bodySchema ?? testSchema,
    },
    response: {
      200: {
        body: () => z.string().max(10).min(1),
      },
      unsafe: { body: true },
    },
  },
  handler: jest.fn(),
});

export const getVersionedRouterDefaults = (bodySchema: any) => ({
  method: 'get',
  path: '/bar',
  options: {
    summary: 'versioned route',
    access: 'public',
    deprecated: true,
    options: {
      tags: ['ignore-me', 'oas-tag:versioned'],
    },
  },
  handlers: [
    {
      fn: jest.fn(),
      options: {
        validate: {
          request: {
            body:
              bodySchema ??
              z.object({
                foo: z.string(),
                deprecatedFoo:
                  // TODO check Zod for deprecated: true
                  z.string({ description: 'deprecated foo' }).optional(),
              }),
          },
          response: {
            [200]: {
              body: () =>
                z.object(
                  { fooResponseWithDescription: z.string() },
                  { description: 'fooResponse' }
                ),
            },
          },
        },
        version: 'oas-test-version-1',
      },
    },
    {
      fn: jest.fn(),
      options: {
        validate: {
          request: { body: z.object({ foo: z.string() }) },
          response: {
            [200]: {
              body: () => z.object({}, { description: 'stream response' }),
              bodyContentType: 'application/octet-stream',
            },
            unsafe: { body: true },
          },
        },
        version: 'oas-test-version-2',
      },
    },
  ],
});

interface CreatTestRouterArgs {
  routers?: { [routerId: string]: { routes: Array<Partial<RoutesMeta>> } };
  versionedRouters?: {
    [routerId: string]: { routes: Array<Partial<VersionedRoutesMeta>> };
  };
  bodySchema?: any;
}

export const createTestRoutersForZod = (
  { routers = {}, versionedRouters = {}, bodySchema }: CreatTestRouterArgs = {
    routers: { testRouter: { routes: [{}] } },
    versionedRouters: { testVersionedRouter: { routes: [{}] } },
  }
): [routers: Router[], versionedRouters: CoreVersionedRouter[]] => {
  return [
    [
      ...Object.values(routers).map((rs) =>
        createRouterForZod({
          routes: rs.routes.map((r) => Object.assign(getRouterDefaults(bodySchema), r)),
        })
      ),
    ],
    [
      ...Object.values(versionedRouters).map((rs) =>
        createVersionedRouterForZod({
          routes: rs.routes.map((r) => Object.assign(getVersionedRouterDefaults(bodySchema), r)),
        })
      ),
    ],
  ];
};
