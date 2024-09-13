/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerRouteForBundleMock } from './register_bundle_routes.test.mocks';

import type { PackageInfo } from '@kbn/config';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { registerBundleRoutes } from './register_bundle_routes';
import { FileHashCache } from './file_hash_cache';
import { BasePath, StaticAssets } from '@kbn/core-http-server-internal';

const createPackageInfo = (parts: Partial<PackageInfo> = {}): PackageInfo => ({
  buildNum: 42,
  buildSha: 'shasha',
  buildShaShort: 'sha',
  dist: true,
  branch: 'master',
  version: '8.0.0',
  buildDate: new Date('2023-05-15T23:12:09.000Z'),
  buildFlavor: 'traditional',
  ...parts,
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
  let staticAssets: StaticAssets;

  beforeEach(() => {
    router = httpServiceMock.createRouter();
    const basePath = httpServiceMock.createBasePath('/server-base-path') as unknown as BasePath;
    staticAssets = new StaticAssets({ basePath, cdnConfig: {} as any, shaDigest: 'sha' });
  });

  afterEach(() => {
    registerRouteForBundleMock.mockReset();
  });

  it('registers core and shared-dep bundles', () => {
    registerBundleRoutes({
      router,
      staticAssets,
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins(),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(4);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'uiSharedDepsSrcDistDir',
      publicPath: '/server-base-path/sha/bundles/kbn-ui-shared-deps-src/',
      routePath: '/sha/bundles/kbn-ui-shared-deps-src/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'uiSharedDepsNpmDistDir',
      publicPath: '/server-base-path/sha/bundles/kbn-ui-shared-deps-npm/',
      routePath: '/sha/bundles/kbn-ui-shared-deps-npm/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: expect.stringMatching(/\/@kbn\/core\/target\/public$/),
      publicPath: '/server-base-path/sha/bundles/core/',
      routePath: '/sha/bundles/core/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: 'kbnMonacoBundleDir',
      publicPath: '/server-base-path/sha/bundles/kbn-monaco/',
      routePath: '/sha/bundles/kbn-monaco/',
    });
  });

  it('registers plugin bundles', () => {
    registerBundleRoutes({
      router,
      staticAssets,
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins('plugin-a', 'plugin-b'),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(6);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: '/plugins/plugin-a/public-target-dir',
      publicPath: '/server-base-path/sha/bundles/plugin/plugin-a/8.0.0/',
      routePath: '/sha/bundles/plugin/plugin-a/8.0.0/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: '/plugins/plugin-b/public-target-dir',
      publicPath: '/server-base-path/sha/bundles/plugin/plugin-b/8.0.0/',
      routePath: '/sha/bundles/plugin/plugin-b/8.0.0/',
    });
  });
});
