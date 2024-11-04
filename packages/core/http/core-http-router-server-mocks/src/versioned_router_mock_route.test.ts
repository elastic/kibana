/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createVersionedRouterMock } from './versioned_router.mock';

describe('createVersionedRouterMock#getRoute', () => {
  it('throws if no routes are registered', () => {
    const versionedRouter = createVersionedRouterMock();
    expect(() => versionedRouter.getRoute('get', '/foo')).toThrow(/No routes registered/);
    versionedRouter.get({ path: '/foo', access: 'internal' });
    expect(() => versionedRouter.getRoute('get', '/foo')).not.toThrow();
    expect(() => versionedRouter.getRoute('get', '/bar')).toThrow(/No routes registered/);
  });
  it('allows versioned routes to be introspected', () => {
    const versionedRouter = createVersionedRouterMock();
    const route = versionedRouter.get({ path: '/foo', access: 'internal' });

    // Empty case
    expect(versionedRouter.getRoute('get', '/foo')).toMatchInlineSnapshot(`
      Object {
        "config": Object {
          "access": "internal",
          "path": "/foo",
        },
        "versions": Object {},
      }
    `);

    const myHandler = jest.fn();
    route
      .addVersion({ validate: false, version: '1' }, myHandler)
      .addVersion({ validate: false, version: '2' }, myHandler)
      .addVersion({ validate: false, version: '3' }, myHandler);

    const introspectedRoute = versionedRouter.getRoute('get', '/foo');
    expect(introspectedRoute).toMatchInlineSnapshot(`
      Object {
        "config": Object {
          "access": "internal",
          "path": "/foo",
        },
        "versions": Object {
          "1": Object {
            "config": Object {
              "validate": false,
              "version": "1",
            },
            "handler": [MockFunction],
          },
          "2": Object {
            "config": Object {
              "validate": false,
              "version": "2",
            },
            "handler": [MockFunction],
          },
          "3": Object {
            "config": Object {
              "validate": false,
              "version": "3",
            },
            "handler": [MockFunction],
          },
        },
      }
    `);

    expect(introspectedRoute.versions['3'].handler).toBe(myHandler);
    expect(introspectedRoute.versions['3'].config.version).toBe('3');
    expect(introspectedRoute.versions['3'].config.validate).toBe(false);
  });
});
