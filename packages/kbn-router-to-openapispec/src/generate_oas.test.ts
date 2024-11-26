/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema, Type } from '@kbn/config-schema';
import { generateOpenApiDocument } from './generate_oas';
import { createTestRouters, createRouter, createVersionedRouter } from './generate_oas.test.util';
import {
  sharedOas,
  createSharedZodSchema,
  createSharedConfigSchema,
} from './generate_oas.test.fixture';

interface RecursiveType {
  name: string;
  self: undefined | RecursiveType;
}

describe('generateOpenApiDocument', () => {
  describe('@kbn/config-schema', () => {
    it('generates the expected OpenAPI document for the shared schema', () => {
      const [routers, versionedRouters] = createTestRouters({
        routers: { testRouter: { routes: [{ method: 'get' }, { method: 'post' }] } },
        versionedRouters: { testVersionedRouter: { routes: [{}] } },
        bodySchema: createSharedConfigSchema(),
      });
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
      ).toEqual(sharedOas);
    });

    it('generates the expected OpenAPI document', () => {
      const [routers, versionedRouters] = createTestRouters({
        routers: {
          testRouter: {
            routes: [
              { method: 'get' },
              { method: 'post' },
              { method: 'post', path: '/no-xsrf/{id}/{path*}', options: { xsrfRequired: false } },
              {
                method: 'delete',
                validationSchemas: {
                  request: {},
                  response: { [200]: { description: 'good response' } },
                },
              },
            ],
          },
        },
        versionedRouters: {
          testVersionedRouter: {
            routes: [
              { method: 'get' },
              {
                method: 'post',
                path: '/no-xsrf/{id}/{path*}',
                options: { access: 'public', options: { xsrfRequired: false } },
              },
            ],
          },
        },
      });
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
      const sharedIdSchema = schema.string({ minLength: 1, meta: { description: 'test' } });
      const sharedNameSchema = schema.string({ minLength: 1 });
      const otherSchema = schema.object(
        { name: sharedNameSchema, other: schema.string() },
        { meta: { id: 'foo' } }
      );
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

    it('handles recursive schemas', () => {
      const id = 'recursive';
      const recursiveSchema: Type<RecursiveType> = schema.object(
        {
          name: schema.string(),
          self: schema.lazy<RecursiveType>(id),
        },
        { meta: { id } }
      );
      expect(
        generateOpenApiDocument(
          {
            routers: [
              createRouter({
                routes: [
                  {
                    isVersioned: false,
                    path: '/recursive',
                    method: 'get',
                    validationSchemas: {
                      request: {
                        body: recursiveSchema,
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

  describe('Zod', () => {
    it('generates the expected OpenAPI document for the shared schema', () => {
      const [routers, versionedRouters] = createTestRouters({
        routers: { testRouter: { routes: [{ method: 'get' }, { method: 'post' }] } },
        versionedRouters: { testVersionedRouter: { routes: [{}] } },
        bodySchema: createSharedZodSchema(),
      });
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
      ).toMatchObject(sharedOas);
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

  describe('tags', () => {
    it('handles tags as expected', () => {
      const [routers, versionedRouters] = createTestRouters({
        routers: {
          testRouter1: {
            routes: [
              { path: '/1-1/{id}/{path*}', options: { tags: ['oas-tag:1', 'oas-tag:2', 'foo'] } },
              { path: '/1-2/{id}/{path*}', options: { tags: ['oas-tag:1', 'foo'] } },
            ],
          },
          testRouter2: { routes: [{ path: '/2-1/{id}/{path*}', options: { tags: undefined } }] },
        },
        versionedRouters: {
          testVersionedRouter1: {
            routes: [
              { path: '/v1-1', options: { access: 'public', options: { tags: ['oas-tag:v1'] } } },
              {
                path: '/v1-2',
                options: {
                  access: 'public',
                  options: { tags: ['foo', 'bar', 'oas-tag:v2', 'oas-tag:v3'] },
                },
              },
            ],
          },
          testVersionedRouter2: {
            routes: [
              { path: '/v2-1', options: { access: 'public', options: { tags: undefined } } },
            ],
          },
        },
      });
      const result = generateOpenApiDocument(
        {
          routers,
          versionedRouters,
        },
        {
          title: 'test',
          baseUrl: 'https://test.oas',
          version: '99.99.99',
        }
      );
      // router paths
      expect(result.paths['/1-1/{id}/{path}']!.get!.tags).toEqual(['1', '2']);
      expect(result.paths['/1-2/{id}/{path}']!.get!.tags).toEqual(['1']);
      expect(result.paths['/2-1/{id}/{path}']!.get!.tags).toEqual([]);
      // versioned router paths
      expect(result.paths['/v1-1']!.get!.tags).toEqual(['v1']);
      expect(result.paths['/v1-2']!.get!.tags).toEqual(['v2', 'v3']);
      expect(result.paths['/v2-1']!.get!.tags).toEqual([]);
    });
  });

  describe('availability', () => {
    it('creates the expected availability entries', () => {
      const [routers, versionedRouters] = createTestRouters({
        routers: {
          testRouter1: {
            routes: [
              {
                path: '/1-1/{id}/{path*}',
                options: { availability: { stability: 'experimental' } },
              },
              {
                path: '/1-2/{id}/{path*}',
                options: { availability: { stability: 'beta' } },
              },
              {
                path: '/1-3/{id}/{path*}',
                options: { availability: { stability: 'stable' } },
              },
            ],
          },
          testRouter2: {
            routes: [{ path: '/2-1/{id}/{path*}' }],
          },
        },
        versionedRouters: {
          testVersionedRouter1: {
            routes: [
              {
                path: '/v1-1',
                options: {
                  access: 'public',
                  options: { availability: { stability: 'experimental' } },
                },
              },
              {
                path: '/v1-2',
                options: {
                  access: 'public',
                  options: { availability: { stability: 'beta' } },
                },
              },
              {
                path: '/v1-3',
                options: {
                  access: 'public',
                  options: { availability: { stability: 'stable' } },
                },
              },
            ],
          },
          testVersionedRouter2: {
            routes: [{ path: '/v2-1', options: { access: 'public' } }],
          },
        },
      });
      const result = generateOpenApiDocument(
        {
          routers,
          versionedRouters,
        },
        {
          title: 'test',
          baseUrl: 'https://test.oas',
          version: '99.99.99',
        }
      );

      // router paths
      expect(result.paths['/1-1/{id}/{path}']!.get).toMatchObject({
        'x-state': 'Technical Preview',
      });
      expect(result.paths['/1-2/{id}/{path}']!.get).toMatchObject({
        'x-state': 'Beta',
      });

      expect(result.paths['/1-3/{id}/{path}']!.get).not.toMatchObject({
        'x-state': expect.any(String),
      });
      expect(result.paths['/2-1/{id}/{path}']!.get).not.toMatchObject({
        'x-state': expect.any(String),
      });

      // versioned router paths
      expect(result.paths['/v1-1']!.get).toMatchObject({
        'x-state': 'Technical Preview',
      });
      expect(result.paths['/v1-2']!.get).toMatchObject({
        'x-state': 'Beta',
      });

      expect(result.paths['/v1-3']!.get).not.toMatchObject({
        'x-state': expect.any(String),
      });
      expect(result.paths['/v2-1']!.get).not.toMatchObject({
        'x-state': expect.any(String),
      });
    });
  });
});
