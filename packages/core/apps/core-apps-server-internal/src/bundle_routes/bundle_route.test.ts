/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createDynamicAssetHandlerMock } from './bundle_route.test.mocks';

import { httpServiceMock } from '@kbn/core-http-server-mocks';
import { FileHashCache } from './file_hash_cache';
import { registerRouteForBundle } from './bundles_route';

describe('registerRouteForBundle', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;
  let fileHashCache: FileHashCache;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    fileHashCache = new FileHashCache();
  });

  afterEach(() => {
    createDynamicAssetHandlerMock.mockReset();
  });

  it('calls `router.get` with the correct parameters', () => {
    const handler = jest.fn();
    createDynamicAssetHandlerMock.mockReturnValue(handler);

    registerRouteForBundle(router, {
      isDist: false,
      publicPath: '/public-path/',
      bundlesPath: '/bundle-path',
      fileHashCache,
      routePath: '/route-path/',
    });

    expect(router.get).toHaveBeenCalledTimes(1);
    expect(router.get).toHaveBeenCalledWith(
      {
        path: '/route-path/{path*}',
        options: {
          authRequired: false,
        },
        validate: expect.any(Object),
      },
      handler
    );
  });

  it('calls `createDynamicAssetHandler` with the correct parameters', () => {
    registerRouteForBundle(router, {
      isDist: false,
      publicPath: '/public-path/',
      bundlesPath: '/bundle-path',
      fileHashCache,
      routePath: '/route-path/',
    });

    expect(createDynamicAssetHandlerMock).toHaveBeenCalledTimes(1);
    expect(createDynamicAssetHandlerMock).toHaveBeenCalledWith({
      isDist: false,
      publicPath: '/public-path/',
      bundlesPath: '/bundle-path',
      fileHashCache,
    });
  });
});
