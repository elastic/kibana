/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RequestHandler } from '@kbn/core-http-server';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { InternalVersionedRouter } from '.';

describe('Versioned router', () => {
  let router: IRouter;
  const handlerFn: RequestHandler = async (ctx, req, res) => res.ok();
  beforeEach(() => {
    router = httpServiceMock.createRouter();
  });

  it('can register multiple routes', () => {
    const versionedRouter = InternalVersionedRouter.from({ router });
    versionedRouter.get({ path: '/test/{id}', access: 'internal' });
    versionedRouter.post({ path: '/test', access: 'internal' });
    versionedRouter.delete({ path: '/test', access: 'internal' });
    expect(versionedRouter.getRoutes()).toHaveLength(3);
  });

  describe('Versioned route', () => {
    it('can register multiple handlers', () => {
      const versionedRouter = InternalVersionedRouter.from({ router });
      versionedRouter
        .get({ path: '/test/{id}', access: 'internal' })
        .addVersion({ version: '1', validate: false }, handlerFn)
        .addVersion({ version: '2', validate: false }, handlerFn)
        .addVersion({ version: '3', validate: false }, handlerFn);
      const routes = versionedRouter.getRoutes();
      expect(routes).toHaveLength(1);
      const [route] = routes;
      expect(route.handlers).toHaveLength(3);
      // We only register one route with the underlying router
      expect(router.get).toHaveBeenCalledTimes(1);
    });
    it('does not allow specifying a handler for the same version more than once', () => {
      const versionedRouter = InternalVersionedRouter.from({ router });
      expect(() =>
        versionedRouter
          .get({ path: '/test/{id}', access: 'internal' })
          .addVersion({ version: '1', validate: false }, handlerFn)
          .addVersion({ version: '1', validate: false }, handlerFn)
          .addVersion({ version: '3', validate: false }, handlerFn)
      ).toThrowError(
        `Version 1 handler has already been registered for the route "get /test/{id}"`
      );
    });
  });
});
