/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { Router } from '../router';
import { CoreVersionedRouter } from '.';
import { createRouter } from './mocks';
import { createTestEnv } from '@kbn/config-mocks';

const pluginId = Symbol('test');
describe('Versioned router', () => {
  let router: Router;
  let versionedRouter: CoreVersionedRouter;
  beforeEach(() => {
    router = createRouter({ pluginId });
    versionedRouter = CoreVersionedRouter.from({
      router,
      log: loggingSystemMock.createLogger(),
      env: createTestEnv(),
    });
  });

  it('can register multiple routes', () => {
    versionedRouter.get({
      path: '/test/{id}',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
      access: 'internal',
    });
    versionedRouter.post({
      path: '/test',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
      access: 'internal',
    });
    versionedRouter.delete({
      path: '/test',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
      access: 'internal',
    });
    expect(versionedRouter.getRoutes()).toHaveLength(3);
  });

  it('registers pluginId if router has one', () => {
    expect(versionedRouter.pluginId).toBe(pluginId);
  });

  it('provides the expected metadata', () => {
    versionedRouter.get({
      path: '/test/{id}',
      access: 'internal',
      discontinued: 'x.y.z',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
    });
    versionedRouter.post({
      path: '/test',
      access: 'internal',
      summary: 'Post test',
      description: 'Post test description',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
    });
    versionedRouter.delete({
      path: '/test',
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: ['foo'],
        },
      },
    });
    expect(versionedRouter.getRoutes()).toMatchInlineSnapshot(`
      Array [
        Object {
          "handlers": Array [],
          "isVersioned": true,
          "method": "get",
          "options": Object {
            "access": "internal",
            "discontinued": "x.y.z",
            "security": Object {
              "authz": Object {
                "requiredPrivileges": Array [
                  "foo",
                ],
              },
            },
          },
          "path": "/test/{id}",
        },
        Object {
          "handlers": Array [],
          "isVersioned": true,
          "method": "post",
          "options": Object {
            "access": "internal",
            "description": "Post test description",
            "security": Object {
              "authz": Object {
                "requiredPrivileges": Array [
                  "foo",
                ],
              },
            },
            "summary": "Post test",
          },
          "path": "/test",
        },
        Object {
          "handlers": Array [],
          "isVersioned": true,
          "method": "delete",
          "options": Object {
            "access": "internal",
            "security": Object {
              "authz": Object {
                "requiredPrivileges": Array [
                  "foo",
                ],
              },
            },
          },
          "path": "/test",
        },
      ]
    `);
  });
});
