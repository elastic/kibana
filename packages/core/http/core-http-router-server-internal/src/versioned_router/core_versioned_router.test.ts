/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Router } from '../router';
import { CoreVersionedRouter } from '.';
import { createRouter } from './mocks';

describe('Versioned router', () => {
  let router: Router;
  beforeEach(() => {
    router = createRouter();
  });

  it('can register multiple routes', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter.get({ path: '/test/{id}', access: 'internal' });
    versionedRouter.post({ path: '/test', access: 'internal' });
    versionedRouter.delete({ path: '/test', access: 'internal' });
    expect(versionedRouter.getRoutes()).toHaveLength(3);
  });

  it('registers pluginId if router has one', () => {
    const pluginId = Symbol('test');
    const versionedRouter = CoreVersionedRouter.from({ router: createRouter({ pluginId }) });
    expect(versionedRouter.pluginId).toBe(pluginId);
  });

  it('provides the expected metadata', () => {
    const versionedRouter = CoreVersionedRouter.from({ router });
    versionedRouter.get({
      path: '/test/{id}',
      access: 'internal',
      deprecated: true,
      'x-discontinued': 'x.y.z',
    });
    versionedRouter.post({
      path: '/test',
      access: 'internal',
      summary: 'Post test',
      description: 'Post test description',
    });
    versionedRouter.delete({ path: '/test', access: 'internal' });
    expect(versionedRouter.getRoutes()).toMatchInlineSnapshot(`
      Array [
        Object {
          "handlers": Array [],
          "method": "get",
          "options": Object {
            "access": "internal",
            "deprecated": true,
            "x-discontinued": "x.y.z",
          },
          "path": "/test/{id}",
        },
        Object {
          "handlers": Array [],
          "method": "post",
          "options": Object {
            "access": "internal",
            "description": "Post test description",
            "summary": "Post test",
          },
          "path": "/test",
        },
        Object {
          "handlers": Array [],
          "method": "delete",
          "options": Object {
            "access": "internal",
          },
          "path": "/test",
        },
      ]
    `);
  });
});
