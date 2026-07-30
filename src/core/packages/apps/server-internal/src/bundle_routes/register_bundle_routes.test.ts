/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Fs from 'fs';
import Path from 'path';

import { registerRouteForBundleMock } from './register_bundle_routes.test.mocks';

import type { PackageInfo } from '@kbn/config';
import type { BasePath } from '@kbn/core-http-server-internal';
import { StaticAssets } from '@kbn/core-http-server-internal';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import { fromRoot } from '@kbn/repo-info';

import { FileHashCache } from './file_hash_cache';
import { registerBundleRoutes } from './register_bundle_routes';

const packageInfo: PackageInfo = {
  buildNum: 42,
  buildSha: 'shasha',
  buildShaShort: 'sha',
  dist: true,
  branch: 'main',
  version: '8.0.0',
  buildDate: new Date('2023-05-15T23:12:09.000Z'),
  buildFlavor: 'traditional',
};

const createUiPlugins = (publicTargetDir?: string): UiPlugins => ({
  browserConfigs: new Map(),
  public: new Map(),
  internal: publicTargetDir
    ? new Map<string, InternalPluginInfo>([
        [
          'ext-plugin',
          {
            publicTargetDir,
            publicAssetsDir: Path.join(fromRoot('plugins'), 'ext-plugin', 'assets'),
            version: '8.0.0',
            requiredBundles: [],
          },
        ],
      ])
    : new Map(),
});

describe('registerBundleRoutes', () => {
  const router = httpServiceMock.createRouter();
  const basePath = httpServiceMock.createBasePath('/server-base-path') as unknown as BasePath;
  const staticAssets = new StaticAssets({ basePath, cdnConfig: {} as never, shaDigest: 'sha' });

  afterEach(() => {
    jest.restoreAllMocks();
    registerRouteForBundleMock.mockReset();
  });

  it('registers shared dependencies and the unified bundles route', () => {
    registerBundleRoutes({ router, staticAssets, packageInfo, uiPlugins: createUiPlugins() });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(4);
    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: fromRoot('target/public/bundles'),
      publicPath: '/server-base-path/sha/bundles/',
      routePath: '/sha/bundles/',
    });
  });

  it('registers an external plugin route when its standalone bundle exists', () => {
    jest.spyOn(Fs, 'existsSync').mockReturnValue(true);
    const publicTargetDir = Path.join(fromRoot('plugins'), 'ext-plugin', 'target');

    registerBundleRoutes({
      router,
      staticAssets,
      packageInfo,
      uiPlugins: createUiPlugins(publicTargetDir),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(5);
    expect(registerRouteForBundleMock).toHaveBeenCalledWith(router, {
      fileHashCache: expect.any(FileHashCache),
      isDist: true,
      bundlesPath: publicTargetDir,
      publicPath: '/server-base-path/sha/bundles/plugin/ext-plugin/8.0.0/',
      routePath: '/sha/bundles/plugin/ext-plugin/8.0.0/',
    });
  });
});
