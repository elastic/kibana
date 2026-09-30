/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Maps a bundle URL basename (e.g. `plugin-discover.abc.js`, `shared-plugins.abc.js`)
 * to a stable logical label for Scout perf aggregation.
 *
 * The unified RSPack build emits `plugin-<pluginId>.<hash>.js` for plugin chunks,
 * named shared split chunks (`shared-plugins.<hash>.js`), numeric split chunks in
 * dist mode, and the `kibana.bundle.js` entry shell.
 */
export function getLogicalBundlePluginLabel(fileName: string): string {
  const base = fileName.replace(/\.js$/i, '');

  // RSPack async plugin chunks: plugin-<pluginId>.<contenthash>
  const rspackPluginChunk = /^plugin-(.+)\.[a-f0-9]{8,}$/i.exec(base);
  if (rspackPluginChunk) {
    return rspackPluginChunk[1];
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
