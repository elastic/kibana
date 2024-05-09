/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateOpenApiDocument } from './generate_oas';
import { schema } from '@kbn/config-schema';
import { createTestRouters, createRouter, createVersionedRouter } from './generate_oas.test.util';

describe('generateOpenApiDocument', () => {
  describe('@kbn/config-schema', () => {
    it('generates the expected OpenAPI document', () => {
      const [routers, versionedRouters] = createTestRouters();
      expect(
        generateOpenApiDocument(
          {
            routers,
            versionedRouters,
          },
          {
            title: 'test',
            baseUrl: 'https://test.oas',
            version: '99.99.99',
          }
        )
      ).toMatchSnapshot();
    });

    it('generates references in the expected format', () => {
      const sharedIdSchema = schema.string({ minLength: 1, meta: { id: 'my.id' } });
      const sharedNameSchema = schema.string({ minLength: 1, meta: { id: 'my.name' } });
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
                        [200]: {
                          body: () => schema.string({ maxLength: 10, minLength: 1 }),
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

  describe('unknown schema/validation', () => {
    it('produces the expected output', () => {
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
                        params: () => ({ value: {} }), // custom validation fn
                        body: () => ({ value: {} }),
                      },
                      response: {
                        [200]: {
                          body: () => undefined as any, // unknown schema
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
                    path: '/test',
                    options: { access: 'public' },
                    handlers: [
                      {
                        fn: jest.fn(),
                        options: {
                          validate: {
                            request: { body: () => ({ value: {} }) },
                            response: { 200: { body: (() => {}) as any } },
                          },
                          version: '123',
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
