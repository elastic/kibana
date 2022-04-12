/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { registerRouteForBundleMock } from './register_bundle_routes.test.mocks';

import { PackageInfo } from '@kbn/config';
import { httpServiceMock } from '../../http/http_service.mock';
import { InternalPluginInfo, UiPlugins } from '../../plugins';
import { registerBundleRoutes } from './register_bundle_routes';

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
  let httpSetup: ReturnType<typeof httpServiceMock.createInternalSetupContract>;

  beforeEach(() => {
    httpSetup = httpServiceMock.createInternalSetupContract();
  });

  afterEach(() => {
    registerRouteForBundleMock.mockReset();
  });

  it('registers core and shared-dep bundles', () => {
    registerBundleRoutes({
      http: httpSetup,
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins(),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(3);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(httpSetup, {
      isDist: true,
      bundlesPath: 'uiSharedDepsSrcDistDir',
      routePath: '/42/bundles/kbn-ui-shared-deps-src/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(httpSetup, {
      isDist: true,
      bundlesPath: 'uiSharedDepsNpmDistDir',
      routePath: '/42/bundles/kbn-ui-shared-deps-npm/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(httpSetup, {
      isDist: true,
      bundlesPath: expect.stringMatching(/src\/core\/target\/public/),
      routePath: '/42/bundles/core/',
    });
  });

  it('registers plugin bundles', () => {
    registerBundleRoutes({
      http: httpSetup,
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins('plugin-a', 'plugin-b'),
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledTimes(5);

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(httpSetup, {
      isDist: true,
      bundlesPath: '/plugins/plugin-a/public-target-dir',
      routePath: '/42/bundles/plugin/plugin-a/8.0.0/',
    });

    expect(registerRouteForBundleMock).toHaveBeenCalledWith(httpSetup, {
      isDist: true,
      bundlesPath: '/plugins/plugin-b/public-target-dir',
      routePath: '/42/bundles/plugin/plugin-b/8.0.0/',
    });
  });
});
