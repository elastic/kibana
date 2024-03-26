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
  describe('happy path', () => {
    it('generates the expected OpenAPI document', () => {
      expect(
        generateOpenApiDocument(
          {
            routers: [
              createRouter({
                routes: [
                  {
                    isVersioned: false,
                    path: '/foo',
                    method: 'get',
                    validationSchemas: {
                      body: schema.object({ foo: schema.string() }),
                    },
                    options: {
                      tags: ['foo'],
                      responses: {
                        200: {
                          body: schema.object({ fooResponse: schema.string() }),
                        },
                      },
                    },
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
  });
});
