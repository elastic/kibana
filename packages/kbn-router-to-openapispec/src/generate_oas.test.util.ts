/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import { createLargeSchema } from './oas_converter/kbn_config_schema/lib.test.util';

type RoutesMeta = ReturnType<Router['getRoutes']>[number];
type VersionedRoutesMeta = ReturnType<CoreVersionedRouter['getRoutes']>[number];

export const createRouter = (args: { routes: RoutesMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as Router;
};
export const createVersionedRouter = (args: { routes: VersionedRoutesMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as CoreVersionedRouter;
};

export const getRouterDefaults = () => ({
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
      params: schema.object({
        id: schema.string({ maxLength: 36, meta: { description: 'id' } }),
        path: schema.string({ maxLength: 36, meta: { description: 'path' } }),
      }),
      query: schema.object({
        page: schema.number({ max: 999, min: 1, defaultValue: 1, meta: { description: 'page' } }),
      }),
      body: createLargeSchema(),
    },
    response: {
      200: {
        body: () => schema.string({ maxLength: 10, minLength: 1 }),
      },
      unsafe: { body: true },
    },
  },
  handler: jest.fn(),
});

export const getVersionedRouterDefaults = () => ({
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
            body: schema.object({
              foo: schema.string(),
              deprecatedFoo: schema.maybe(
                schema.string({ meta: { description: 'deprecated foo', deprecated: true } })
              ),
            }),
          },
          response: {
            [200]: {
              body: () =>
                schema.object(
                  { fooResponseWithDescription: schema.string() },
                  { meta: { description: 'fooResponse' } }
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
          request: { body: schema.object({ foo: schema.string() }) },
          response: {
            [200]: {
              body: () => schema.stream({ meta: { description: 'stream response' } }),
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
}

export const createTestRouters = (
  { routers = {}, versionedRouters = {} }: CreatTestRouterArgs = {
    routers: { testRouter: { routes: [{}] } },
    versionedRouters: { testVersionedRouter: { routes: [{}] } },
  }
): [routers: Router[], versionedRouters: CoreVersionedRouter[]] => {
  return [
    [
      ...Object.values(routers).map((rs) =>
        createRouter({ routes: rs.routes.map((r) => Object.assign(getRouterDefaults(), r)) })
      ),
    ],
    [
      ...Object.values(versionedRouters).map((rs) =>
        createVersionedRouter({
          routes: rs.routes.map((r) => Object.assign(getVersionedRouterDefaults(), r)),
        })
      ),
    ],
  ];
};
