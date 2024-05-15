/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import type { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';

/** Intended to cover a wide set of schema configurations */
export const testSchema = schema.object({
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
  neverType: schema.never(),
  map: schema.mapOf(schema.string(), schema.string()),
  record: schema.recordOf(schema.string(), schema.string()),
  union: schema.oneOf([
    schema.string({ maxLength: 1, meta: { description: 'Union string' } }),
    schema.number({ min: 0, meta: { description: 'Union number' } }),
  ]),
  uri: schema.uri({
    scheme: ['prototest'],
    defaultValue: () => 'prototest://something',
  }),
  any: schema.any({ meta: { description: 'any type' } }),
});

type RouterMeta = ReturnType<Router['getRoutes']>[number];
type VersionedRouterMeta = ReturnType<CoreVersionedRouter['getRoutes']>[number];

export const createRouter = (args: { routes: RouterMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as Router;
};
export const createVersionedRouter = (args: { routes: VersionedRouterMeta[] }) => {
  return {
    getRoutes: () => args.routes,
  } as unknown as CoreVersionedRouter;
};

const getRouterDefaults = () => ({
  isVersioned: false,
  path: '/foo/{id}/{path*}',
  method: 'get',
  options: {
    tags: ['foo'],
    description: 'route',
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
      body: testSchema,
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

const getVersionedRouterDefaults = () => ({
  method: 'get',
  path: '/bar',
  options: {
    description: 'versioned route',
    access: 'public',
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

export const createTestRouters = (
  {
    routers = [],
    versionedRouters = [],
  }: {
    routers?: Array<Array<Partial<RouterMeta>>>;
    versionedRouters?: Array<Array<Partial<VersionedRouterMeta>>>;
  } = { routers: [[{}]], versionedRouters: [[{}]] }
): [routers: Router[], versionedRouters: CoreVersionedRouter[]] => {
  return [
    [
      ...routers.map((rs) =>
        createRouter({ routes: rs.map((r) => Object.assign(getRouterDefaults(), r)) })
      ),
    ],
    [
      ...versionedRouters.map((rs) =>
        createVersionedRouter({
          routes: rs.map((r) => Object.assign(getVersionedRouterDefaults(), r)),
        })
      ),
    ],
  ];
};
