/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerRouteForBundleMock } from './register_bundle_routes.test.mocks';

import type { PackageInfo } from '@kbn/config';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { registerBundleRoutes } from './register_bundle_routes';
import { FileHashCache } from './file_hash_cache';

const createPackageInfo = (parts: Partial<PackageInfo> = {}): PackageInfo => ({
  ...parts,
  buildNum: 42,
  buildSha: 'sha',
  dist: true,
  branch: 'master',
  version: '8.0.0',
});

const createUiPlugins = (...ids: string[]): UiPlugins => ({
  browserConfigs: new Map(),
  public: new Map(),
  internal: ids.reduce((map, id) => {
    map.set(id, {
      publicTargetDir: `/plugins/${id}/public-target-dir`,
      publicAssetsDir: `/plugins/${id}/public-assets-dir`,
      version: '8.0.0',
      requiredBundles: [],
    });
    return map;
  }, new Map<string, InternalPluginInfo>()),
});

describe('registerBundleRoutes', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
  });

  afterEach(() => {
    registerRouteForBundleMock.mockReset();
  });

  it('registers core and shared-dep bundles', () => {
    registerBundleRoutes({
      router,
      serverBasePath: '/server-base-path',
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins(),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(4);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'uiSharedDepsSrcDistDir',
      publicPath: '/server-base-path/42/bundles/kbn-ui-shared-deps-src/',
      routePath: '/42/bundles/kbn-ui-shared-deps-src/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'uiSharedDepsNpmDistDir',
      publicPath: '/server-base-path/42/bundles/kbn-ui-shared-deps-npm/',
      routePath: '/42/bundles/kbn-ui-shared-deps-npm/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: expect.stringMatching(/src\/core\/target\/public/),
      publicPath: '/server-base-path/42/bundles/core/',
      routePath: '/42/bundles/core/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'kbnMonacoBundleDir',
      publicPath: '/server-base-path/42/bundles/kbn-monaco/',
      routePath: '/42/bundles/kbn-monaco/',
    });
  });

  it('registers plugin bundles', () => {
    registerBundleRoutes({
      router,
      serverBasePath: '/server-base-path',
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins('plugin-a', 'plugin-b'),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(6);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: '/plugins/plugin-a/public-target-dir',
      publicPath: '/server-base-path/42/bundles/plugin/plugin-a/8.0.0/',
      routePath: '/42/bundles/plugin/plugin-a/8.0.0/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: '/plugins/plugin-b/public-target-dir',
      publicPath: '/server-base-path/42/bundles/plugin/plugin-b/8.0.0/',
      routePath: '/42/bundles/plugin/plugin-b/8.0.0/',
    });
  });
});
