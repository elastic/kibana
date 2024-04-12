/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { generateOpenApiDocument } from './generate_oas';
import { schema } from '@kbn/config-schema';
import { createTestRouters, createRouter } from './generate_oas.test.util';

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
