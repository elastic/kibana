/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';

/** Intended to cover a wide set of schema configurations */
export const testSchema = schema.object({
  string: schema.string({ maxLength: 10, minLength: 1 }),
  maybeNumber: schema.maybe(schema.number({ max: 1000, min: 1 })),
  booleanDefault: schema.boolean({
    defaultValue: true,
    description: 'defaults to to true',
  }),
  ipType: schema.ip({ versions: ['ipv4'] }),
  literalType: schema.literal('literallythis'),
  neverType: schema.never(),
  map: schema.mapOf(schema.string(), schema.string()),
  record: schema.recordOf(schema.string(), schema.string()),
  union: schema.oneOf([
    schema.string({ maxLength: 1, description: 'Union string' }),
    schema.number({ min: 0, description: 'Union number' }),
  ]),
  uri: schema.uri({
    scheme: ['prototest'],
    defaultValue: () => 'prototest://something',
  }),
});

type RouterMeta = ReturnType<Router['getRoutes']>[number];
type VersionedRouterMeta = ReturnType<CoreVersionedRouter['getRoutes']>[number];

export const createRouter = (args: { routes: RouterMeta[] }) => {
  const router: Router = Object.create(Router);
  return {
    router,
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
  path: '/foo/{id}',
  method: 'get',
  validationSchemas: {
    request: {
      params: schema.object({ id: schema.string({ maxLength: 36 }) }),
      query: schema.object({ page: schema.number({ max: 999, min: 1 }) }),
      body: testSchema,
    },
    response: {
      200: {
        body: schema.string({ maxLength: 10, minLength: 1 }),
      },
    },
  },
  options: { tags: ['foo'] },
  handler: jest.fn(),
});

const getVersionedRouterDefaults = () => ({
  method: 'get',
  path: '/bar',
  options: {
    access: 'public',
  },
  handlers: [
    {
      fn: jest.fn(),
      options: {
        validate: {
          request: { body: schema.object({ foo: schema.string() }) },
          response: {
            [200]: { body: schema.object({ fooResponse: schema.string() }) },
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
            [200]: { body: schema.object({ fooResponse: schema.string() }) },
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
