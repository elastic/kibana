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
 * Get JS dependency paths for RSPack unified compilation mode.
 *
 * In unified mode, ALL plugins are compiled into a single bundle (kibana.bundle.js).
 * This allows RSPack to properly deduplicate shared modules across all plugins.
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) - for npm externals
 * 2. Single unified Kibana bundle - contains core + all plugins + runtime
 *
 * The RSPack runtime is embedded in kibana.bundle.js (runtimeChunk: false).
 * Async chunks do NOT contain runtime - they use JSONP format:
 *   (self.webpackChunkkibana=self.webpackChunkkibana||[]).push([...])
 * The runtime in kibana.bundle.js processes these pushed chunks.
 */
export const getRspackDependencyPaths = (
  regularBundlePath: string,
  _bundlePaths: Map<string, PluginInfo>
) => {
  return [
    // 1. Shared deps built by webpack (for npm externals like React, lodash)
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.dllFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.jsFilename}`,

    // 2. Single unified bundle containing core + all plugins + runtime
    `${regularBundlePath}/kibana.bundle.js`,
  ];
};
