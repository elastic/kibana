/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import type { PluginInfo } from './get_plugin_bundle_paths';

export const getJsDependencyPaths = (
  regularBundlePath: string,
  bundlePaths: Map<string, PluginInfo>
) => {
  return [
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.dllFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.jsFilename}`,
    `${regularBundlePath}/core/core.entry.js`,
    ...[...bundlePaths.values()].map((plugin) => plugin.bundlePath),
  ];
};

/**
 * Get JS dependency paths for RSPack single-compilation mode.
 * Bundles are output to /bundles/{pluginId}/{pluginId}.plugin.js
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps)
 * 2. Core bundle
 * 3. Plugin bundles
 *
 * Each bundle is self-contained with its own runtime.
 * Shared chunks are loaded automatically when needed.
 */
export const getRspackDependencyPaths = (
  regularBundlePath: string,
  bundlePaths: Map<string, PluginInfo>
) => {
  return [
    // 1. Shared deps are still built by webpack
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.dllFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.jsFilename}`,
    // 2. Core from RSPack output
    `${regularBundlePath}/core/core.plugin.js`,
    // 3. Plugins from RSPack output
    ...[...bundlePaths.keys()].map(
      (pluginId) => `${regularBundlePath}/${pluginId}/${pluginId}.plugin.js`
    ),
  ];
};
