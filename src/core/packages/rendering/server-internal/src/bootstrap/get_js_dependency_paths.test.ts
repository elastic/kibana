/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getJsDependencyPaths, getRspackDependencyPaths } from './get_js_dependency_paths';
import type { PluginInfo } from './get_plugin_bundle_paths';

describe('getJsDependencyPaths', () => {
  it('returns the correct list of paths', () => {
    const bundlePaths = new Map<string, PluginInfo>();
    bundlePaths.set('plugin1', {
      bundlePath: 'plugin1/bundle-path.js',
      publicPath: 'plugin1/public-path',
    });
    bundlePaths.set('plugin2', {
      bundlePath: 'plugin2/bundle-path.js',
      publicPath: 'plugin2/public-path',
    });

    expect(getJsDependencyPaths('/regular-bundle-path', bundlePaths)).toMatchInlineSnapshot(`
      Array [
        "/regular-bundle-path/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js",
        "/regular-bundle-path/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js",
        "/regular-bundle-path/core/core.entry.js",
        "plugin1/bundle-path.js",
        "plugin2/bundle-path.js",
      ]
    `);
  });
});

describe('getRspackDependencyPaths', () => {
  const bundlePaths = new Map<string, PluginInfo>();

  it('returns shared deps before chunk paths before kibana.bundle.js', () => {
    const paths = getRspackDependencyPaths('/bundles', bundlePaths, [], ['/bundles/chunk-abc.js']);

    expect(paths).toEqual([
      '/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js',
      '/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js',
      '/bundles/chunk-abc.js',
      '/bundles/kibana.bundle.js',
    ]);
  });

  it('returns only shared deps and kibana.bundle.js when chunkPaths and externalPluginPaths are empty', () => {
    const paths = getRspackDependencyPaths('/bundles', bundlePaths);

    expect(paths).toEqual([
      '/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js',
      '/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js',
      '/bundles/kibana.bundle.js',
    ]);
  });

  it('places external plugin paths after kibana.bundle.js', () => {
    const paths = getRspackDependencyPaths(
      '/bundles',
      bundlePaths,
      ['/plugins/ext/ext.plugin.js'],
      ['/bundles/chunk-a.js']
    );

    const bundleIndex = paths.indexOf('/bundles/kibana.bundle.js');
    const extIndex = paths.indexOf('/plugins/ext/ext.plugin.js');
    expect(extIndex).toBeGreaterThan(bundleIndex);
  });

  it('includes multiple chunks and external plugins in correct positions', () => {
    const paths = getRspackDependencyPaths(
      '/bundles',
      bundlePaths,
      ['/plugins/a/a.plugin.js', '/plugins/b/b.plugin.js'],
      ['/bundles/chunk-1.js', '/bundles/chunk-2.js']
    );

    expect(paths).toEqual([
      '/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js',
      '/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js',
      '/bundles/chunk-1.js',
      '/bundles/chunk-2.js',
      '/bundles/kibana.bundle.js',
      '/plugins/a/a.plugin.js',
      '/plugins/b/b.plugin.js',
    ]);
  });
});
