/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PluginEntry } from '../types';
/**
 * Find the index entry file for a given target directory within a plugin.
 *
 * Generalizes the previous `findEntry` (which only looked in `public/`) to
 * support any target directory declared in `extraPublicDirs`. This mirrors
 * the legacy webpack optimizer's val-loader entry generation where each
 * target in `bundle.remoteInfo.targets` was resolved via
 * `Path.resolve(bundle.contextDir, target)`.
 *
 * @see packages/kbn-optimizer/src/worker/webpack.config.ts (val-loader entries)
 */
export declare function findTargetEntry(contextDir: string, target?: string): string | null;
/**
 * Collect plugin entries from discovered plugins, including extra targets
 * declared in `extraPublicDirs`.
 *
 * The legacy webpack optimizer registered a `__kbnBundles__.define()` call
 * for every target in `['public', ...extraPublicDirs]` via the val-loader
 * entry creator. This function produces the equivalent set of entries so
 * that `createUnifiedEntry` can generate matching registrations.
 *
 * Each entry includes a `pluginId` field used by `createUnifiedEntry` to
 * group targets under the same `webpackChunkName`, ensuring rspack merges
 * them into a single chunk per plugin.
 */
export declare function collectPluginEntries(
  repoRoot: string,
  plugins: PluginEntry[]
): Array<{
  id: string;
  path: string;
  bundleId: string;
  pluginId: string;
}>;
/**
 * Create a unified entry module with ALL-ASYNC loading:
 *
 * All bundles (core + plugins) are loaded in parallel via dynamic import().
 * kibana.bundle.js becomes a tiny orchestration shell containing only the
 * rspack runtime and the Promise.all that loads everything.
 *
 * Core gets webpackChunkName "plugin-core" and is treated identically
 * to other plugins. Promise.all guarantees all .then() callbacks complete
 * before window.__kbnPluginsLoaded resolves, ensuring core is registered
 * before __kbnBootstrap__() runs.
 */
export declare function createUnifiedEntry(
  wrapperDir: string,
  repoRoot: string,
  pluginEntries: Array<{
    id: string;
    path: string;
    bundleId: string;
    pluginId: string;
  }>
): string;
