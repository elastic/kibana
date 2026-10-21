/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getRspackDependencyPaths } from './get_js_dependency_paths';

describe('getRspackDependencyPaths', () => {
  it('returns shared deps before chunk paths before kibana.bundle.js', () => {
    const paths = getRspackDependencyPaths('/bundles', [], ['/bundles/chunk-abc.js']);

    expect(paths).toEqual([
      '/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js',
      '/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js',
      '/bundles/chunk-abc.js',
      '/bundles/kibana.bundle.js',
    ]);
  });

  it('returns only shared deps and kibana.bundle.js when chunkPaths and externalPluginPaths are empty', () => {
    const paths = getRspackDependencyPaths('/bundles');

    expect(paths).toEqual([
      '/bundles/kbn-ui-shared-deps-npm/kbn-ui-shared-deps-npm.dll.js',
      '/bundles/kbn-ui-shared-deps-src/kbn-ui-shared-deps-src.js',
      '/bundles/kibana.bundle.js',
    ]);
  });

  it('places external plugin paths after kibana.bundle.js', () => {
    const paths = getRspackDependencyPaths(
      '/bundles',
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
