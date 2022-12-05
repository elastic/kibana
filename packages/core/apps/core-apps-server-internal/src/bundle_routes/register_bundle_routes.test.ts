/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PackageInfo } from '@kbn/config';
import { httpServiceMock } from '@kbn/core-http-server-mocks';
import type { InternalPluginInfo, UiPlugins } from '@kbn/core-plugins-base-server-internal';
import {
  createAnyInstanceSerializer,
  createRecursiveSerializer,
  createAbsolutePathSerializer,
} from '@kbn/jest-serializers';

import { registerRouteForBundleMock } from './register_bundle_routes.test.mocks';
import { registerBundleRoutes } from './register_bundle_routes';
import { FileHashCache } from './file_hash_cache';

expect.addSnapshotSerializer(createAbsolutePathSerializer());
expect.addSnapshotSerializer(createAnyInstanceSerializer(FileHashCache));

let router: ReturnType<typeof httpServiceMock.createRouter>;
expect.addSnapshotSerializer(
  createRecursiveSerializer(
    (v) => !!router && v === router,
    (_, printRaw) => printRaw('<Router>')
  )
);

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

    expect(registerRouteForBundleMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <Router>,
          Object {
            "bundlesPath": "uiSharedDepsNpmDistDir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-ui-shared-deps-npm/",
            "routePath": "/42/bundles/kbn-ui-shared-deps-npm/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": "uiSharedDepsSrcDistDir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-ui-shared-deps-src/",
            "routePath": "/42/bundles/kbn-ui-shared-deps-src/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": <absolute path>/src/core/target/public,
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/core/",
            "routePath": "/42/bundles/core/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": <absolute path>/bazel-bin/packages/kbn-monaco/target_workers,
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-monaco/",
            "routePath": "/42/bundles/kbn-monaco/",
          },
        ],
      ]
    `);
  });

  it('registers plugin bundles', () => {
    registerBundleRoutes({
      router,
      serverBasePath: '/server-base-path',
      packageInfo: createPackageInfo(),
      uiPlugins: createUiPlugins('plugin-a', 'plugin-b'),
    });

    expect(registerRouteForBundleMock.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          <Router>,
          Object {
            "bundlesPath": "uiSharedDepsNpmDistDir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-ui-shared-deps-npm/",
            "routePath": "/42/bundles/kbn-ui-shared-deps-npm/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": "uiSharedDepsSrcDistDir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-ui-shared-deps-src/",
            "routePath": "/42/bundles/kbn-ui-shared-deps-src/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": <absolute path>/src/core/target/public,
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/core/",
            "routePath": "/42/bundles/core/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": <absolute path>/bazel-bin/packages/kbn-monaco/target_workers,
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/kbn-monaco/",
            "routePath": "/42/bundles/kbn-monaco/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": "/plugins/plugin-a/public-target-dir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/plugin/plugin-a/8.0.0/",
            "routePath": "/42/bundles/plugin/plugin-a/8.0.0/",
          },
        ],
        Array [
          <Router>,
          Object {
            "bundlesPath": "/plugins/plugin-b/public-target-dir",
            "fileHashCache": <FileHashCache>,
            "isDist": true,
            "publicPath": "/server-base-path/42/bundles/plugin/plugin-b/8.0.0/",
            "routePath": "/42/bundles/plugin/plugin-b/8.0.0/",
          },
        ],
      ]
    `);
  });
});
