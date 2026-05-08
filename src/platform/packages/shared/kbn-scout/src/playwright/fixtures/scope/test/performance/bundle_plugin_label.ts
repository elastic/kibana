/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps a bundle URL basename (e.g. `discover.entry.js`, `plugin-discover.abc.js`)
 * to a stable logical label for Scout perf aggregation.
 *
 * Legacy webpack per-plugin bundles use `<id>.entry.js` / `<id>.chunk.*.js`.
 * Unified RSPack uses `plugin-<pluginId>.<hash>.js`, shared split chunks
 * (`shared-plugins.<hash>.js`), and `kibana.bundle.js`.
 *
 * [rspack-transition] When the legacy optimizer is removed, simplify branches
 * that only exist for legacy filenames (tracked in LEGACY_REMOVAL_CHECKLIST.md).
 */
export function getLogicalBundlePluginLabel(fileName: string): string {
  const base = fileName.replace(/\.js$/i, '');

  // RSPack async plugin chunks: plugin-<pluginId>.<contenthash>
  const rspackPluginChunk = /^plugin-(.+)\.[a-f0-9]{8,}$/i.exec(base);
  if (rspackPluginChunk) {
    return rspackPluginChunk[1];
  }

  // Legacy per-plugin entry bundle
  const legacyEntry = /^(.+)\.entry$/i.exec(base);
  if (legacyEntry) {
    return legacyEntry[1];
  }

  // Legacy async chunk: <pluginId>.chunk.<id>.js
  const legacyChunk = /^(.+)\.chunk\./i.exec(base);
  if (legacyChunk) {
    return legacyChunk[1];
  }

  // RSPack entry shell (and any *.bundle.js one-segment name)
  const bundleShell = /^([^.]+)\.bundle$/i.exec(base);
  if (bundleShell) {
    return bundleShell[1];
  }

  // kbn-ui-shared-deps-npm.dll etc.
  if (base.endsWith('.dll')) {
    return base.slice(0, -'.dll'.length);
  }

  // RSPack production split chunks: <numericChunkId>.<contenthash>
  // In dist mode (`chunkIds: 'deterministic'`), unnamed split chunks get numeric
  // IDs that cannot be mapped back to a single plugin. Group them under one label.
  const rspackNumericChunk = /^\d+\.[a-f0-9]{8,}$/i.exec(base);
  if (rspackNumericChunk) {
    return 'rspack-chunk';
  }

  // Remaining: first path segment of the basename (shared-plugins, vendors, …)
  return base.split('.')[0];
}
