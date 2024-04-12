/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateOpenApiDocument } from './generate_oas';
import { CoreVersionedRouter, Router } from '@kbn/core-http-router-server-internal';
import { schema } from '@kbn/config-schema';

const createRouter = (args: { routes: ReturnType<Router['getRoutes']> }): Router => {
  const router: Router = Object.create(Router);
  return {
    router,
    getRoutes: () => args.routes,
  } as unknown as Router;
};
const createVersionedRouter = (args: {
  routes: ReturnType<CoreVersionedRouter['getRoutes']>;
}): CoreVersionedRouter => {
  return {
    getRoutes: () => args.routes,
  } as unknown as CoreVersionedRouter;
};

describe('generateOpenApiDocument', () => {
  describe('@kbn/config-schema', () => {
    const testSchema = schema.object({
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
    it('generates the expected OpenAPI document', () => {
      expect(
        generateOpenApiDocument(
          {
            routers: [
              createRouter({
                routes: [
                  {
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
                  },
                ],
              }),
            ],
            versionedRouters: [
              createVersionedRouter({
                routes: [
                  {
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
                  },
                ],
              }),
            ],
          },
          {
            title: 'test',
            baseUrl: 'https://test.oas',
            version: '99.99.99',
          }
        )
      ).toMatchSnapshot();
    });

    it('generates references as in the expected format', () => {
      const sharedIdSchema = schema.string({ maxLength: 1, id: 'my.id' });
      const sharedNameSchema = schema.string({ maxLength: 1, id: 'my.name' });
      const otherSchema = schema.object({ name: sharedNameSchema, other: schema.string() });
      expect(
        generateOpenApiDocument(
          {
            routers: [
              createRouter({
                routes: [
                  {
                    isVersioned: false,
                    path: '/foo/{id}',
                    method: 'get',
                    validationSchemas: {
                      request: {
                        params: schema.object({ id: sharedIdSchema }),
                        body: otherSchema,
                      },
                      response: {
                        200: {
                          body: schema.string({ maxLength: 10, minLength: 1 }),
                        },
                      },
                    },
                    options: { tags: ['foo'] },
                    handler: jest.fn(),
                  },
                ],
              }),
            ],
            versionedRouters: [],
          },
          {
            title: 'test',
            baseUrl: 'https://test.oas',
            version: '99.99.99',
          }
        )
      ).toMatchSnapshot();
    });
  });
});
