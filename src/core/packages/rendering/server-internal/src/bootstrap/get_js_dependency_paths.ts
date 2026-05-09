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
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) — npm externals (React, lodash, etc.)
 * 2. Rspack async chunks (shared + plugin entries) — JSONP modules queue into
 *    `globalThis.webpackChunkkibana_bundle` before the runtime loads
 * 3. kibana.bundle.js (LAST) — Rspack runtime drains the JSONP queue, then
 *    dynamic imports resolve instantly without network requests
 * 4. External plugin bundles (if any) — register with __kbnBundles__ on load
 */
export const getRspackDependencyPaths = (
  regularBundlePath: string,
  _bundlePaths: Map<string, PluginInfo>,
  externalPluginPaths: string[] = [],
  chunkPaths: string[] = []
) => {
  return [
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.dllFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.jsFilename}`,

    // Rspack async chunks: loaded before the runtime so their JSONP callbacks
    // push module factories into the global queue. When the runtime (inside
    // kibana.bundle.js) initializes, it drains the queue and marks all chunks
    // as installed, allowing import() to resolve synchronously.
    ...chunkPaths,

    `${regularBundlePath}/kibana.bundle.js`,

    ...externalPluginPaths,
  ];
};
