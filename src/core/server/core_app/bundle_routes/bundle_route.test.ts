/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { httpServiceMock } from '../../http/http_service.mock';
import { registerRouteForBundle } from './bundles_route';

describe('registerRouteForBundle', () => {
  let httpSetup: ReturnType<typeof httpServiceMock.createInternalSetupContract>;

  beforeEach(() => {
    httpSetup = httpServiceMock.createInternalSetupContract();
  });

  describe('when `isDist` is false', () => {
    it('calls `httpSetup.registerStaticDir` with the correct parameters', () => {
      registerRouteForBundle(httpSetup, {
        isDist: false,
        bundlesPath: '/bundle-path',
        routePath: '/route-path/',
      });

      expect(httpSetup.registerStaticDir).toHaveBeenCalledTimes(1);
      expect(httpSetup.registerStaticDir).toHaveBeenCalledWith(
        `/route-path/{path*}`,
        '/bundle-path',
        {
          cache: { otherwise: 'must-revalidate', privacy: 'public' },
          etagMethod: 'hash',
        }
      );
    });
  });

  describe('when `isDist` is true', () => {
    it('calls `httpSetup.registerStaticDir` with the correct parameters', () => {
      registerRouteForBundle(httpSetup, {
        isDist: true,
        bundlesPath: '/bundle-path',
        routePath: '/route-path/',
      });

      expect(httpSetup.registerStaticDir).toHaveBeenCalledTimes(1);
      expect(httpSetup.registerStaticDir).toHaveBeenCalledWith(
        `/route-path/{path*}`,
        '/bundle-path',
        {
          cache: { expiresIn: 31536000000, otherwise: 'immutable', privacy: 'public' },
          etagMethod: false,
        }
      );
    });
  });
});
