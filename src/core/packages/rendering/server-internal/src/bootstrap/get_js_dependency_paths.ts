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
 * In unified mode, internal plugins are compiled into a single bundle (kibana.bundle.js).
 * External (3rd party) plugins are built separately by @kbn/plugin-helpers and loaded
 * as additional scripts after the unified bundle.
 *
 * Load order:
 * 1. Webpack shared deps (kbn-ui-shared-deps) - for npm externals
 * 2. Single unified Kibana bundle - contains core + all internal plugins + runtime
 * 3. External plugin bundles (if any) - register with __kbnBundles__ on load
 */
export const getRspackDependencyPaths = (
  regularBundlePath: string,
  _bundlePaths: Map<string, PluginInfo>,
  externalPluginPaths: string[] = []
) => {
  return [
    // 1. Shared deps built by webpack (for npm externals like React, lodash)
    `${regularBundlePath}/kbn-ui-shared-deps-npm/${UiSharedDepsNpm.dllFilename}`,
    `${regularBundlePath}/kbn-ui-shared-deps-src/${UiSharedDepsSrc.jsFilename}`,

    // 2. Single unified bundle containing core + all internal plugins + runtime
    `${regularBundlePath}/kibana.bundle.js`,

    // 3. External plugin bundles (loaded after unified bundle so __kbnBundles__ is available)
    ...externalPluginPaths,
  ];
};
