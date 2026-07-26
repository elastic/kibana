/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import Fs from 'fs';
import { rspack } from '@rspack/core';
import type { PluginEntry } from '../types';
import { createCoreEntry } from './plugin_discovery';

// Entry file version - increment when changing the entry generation logic
// This ensures the entry file is regenerated when config structure changes
const ENTRY_VERSION = 'v11';

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
export function findTargetEntry(contextDir: string, target: string = 'public'): string | null {
  const targetDir = Path.join(contextDir, target);
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  for (const ext of extensions) {
    const entryPath = Path.join(targetDir, `index${ext}`);
    if (Fs.existsSync(entryPath)) {
      return entryPath;
    }
  }

  return null;
}

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
export function collectPluginEntries(
  repoRoot: string,
  plugins: PluginEntry[]
): Array<{ id: string; path: string; bundleId: string; pluginId: string }> {
  const pluginEntries: Array<{ id: string; path: string; bundleId: string; pluginId: string }> = [];

  const coreEntry = createCoreEntry(repoRoot);
  const coreEntryPath = findTargetEntry(coreEntry.contextDir, 'public');
  if (coreEntryPath) {
    pluginEntries.push({
      id: 'core',
      path: coreEntryPath,
      bundleId: 'entry/core/public',
      pluginId: 'core',
    });
  }

  for (const plugin of plugins) {
    for (const target of plugin.targets) {
      const entryPath = findTargetEntry(plugin.contextDir, target);
      if (entryPath) {
        pluginEntries.push({
          id: target === 'public' ? plugin.id : `${plugin.id}/${target}`,
          path: entryPath,
          bundleId: `plugin/${plugin.id}/${target}`,
          pluginId: plugin.id,
        });
      }
    }
  }

  return pluginEntries;
}

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
export function createUnifiedEntry(
  wrapperDir: string,
  repoRoot: string,
  pluginEntries: Array<{ id: string; path: string; bundleId: string; pluginId: string }>
): string {
  const unifiedEntryPath = Path.join(wrapperDir, 'kibana-unified-entry.js');

  // Convert absolute paths to relative paths for cache portability.
  // Always ensures ./ prefix so rspack treats them as relative imports.
  const toRelativePath = (absolutePath: string, fromDir: string = wrapperDir): string => {
    let relativePath = Path.relative(fromDir, absolutePath).replace(/\\/g, '/');
    if (!relativePath.startsWith('.')) {
      relativePath = './' + relativePath;
    }
    return relativePath;
  };

  // Create a hash using RELATIVE paths so it's consistent across machines
  // This allows cache reuse when the same plugins are present regardless of repo location
  const pluginListHash = rspack.util
    .createHash('xxhash64')
    .update(
      `${ENTRY_VERSION}\n${pluginEntries
        .map((e) => `${e.id}:${Path.relative(repoRoot, e.path)}`)
        .join('\n')}`,
      'utf-8'
    )
    .digest('hex');

  // Check if file exists and has the same hash (skip regeneration)
  if (Fs.existsSync(unifiedEntryPath)) {
    const existingContent = Fs.readFileSync(unifiedEntryPath, 'utf-8');
    const hashMatch = existingContent.match(/\/\/ Plugin list hash: ([a-f0-9]+)/);
    if (hashMatch && hashMatch[1] === pluginListHash) {
      return unifiedEntryPath;
    }
  }

  // Generate thin entry wrappers for each plugin target.
  //
  // Each plugin import() points to a tiny wrapper module (in wrapperDir)
  // that re-exports from the actual plugin source. This ensures every
  // plugin chunk always has at least one unique module that can't be
  // extracted by splitChunks:
  //
  //   - Wrapper paths are in target/.rspack-entry-wrappers/, which does NOT
  //     match any cache group regex (plugins/, packages/, node_modules/).
  //   - Each wrapper is imported by exactly 1 chunk, so minChunks: 2
  //     prevents extraction.
  //   - The actual plugin modules (public/index.ts, etc.) may still be
  //     shared and extracted into shared-plugin-* chunks, but the entry
  //     chunk retains the wrapper and is always emitted.
  //
  // Without these wrappers, plugins whose entire module set satisfies
  // minChunks >= 2 (because other plugins import from them) end up with
  // empty entry chunks that rspack doesn't emit.
  const pluginWrapperDir = Path.join(wrapperDir, 'plugin-entries');
  if (!Fs.existsSync(pluginWrapperDir)) {
    Fs.mkdirSync(pluginWrapperDir, { recursive: true });
  }

  // Generate wrapper files and async imports for ALL entries (core + plugins).
  // Core is treated the same as plugins -- loaded via dynamic import() with
  // webpackChunkName "plugin-core". This makes kibana.bundle.js a tiny
  // orchestration shell and enables core to download in parallel with all plugins.
  // All targets for the same plugin share a webpackChunkName so rspack merges
  // them into a single chunk.
  const BATCH_SIZE = 150;

  const importLines = pluginEntries.map((entry) => {
    const chunkName = `plugin-${entry.pluginId}`;
    const wrapperFilename = `${entry.id.replace(/\//g, '__')}.js`;
    const wrapperPath = Path.join(pluginWrapperDir, wrapperFilename);
    const relativeSourcePath = toRelativePath(entry.path, pluginWrapperDir);

    Fs.writeFileSync(wrapperPath, `export * from ${JSON.stringify(relativeSourcePath)};\n`);

    const relativeWrapperPath = toRelativePath(wrapperPath);
    return `    import(/* webpackChunkName: ${JSON.stringify(chunkName)} */ ${JSON.stringify(
      relativeWrapperPath
    )}).then(m => registerPlugin('${entry.bundleId}', m))`;
  });

  const batches: string[][] = [];
  for (let i = 0; i < importLines.length; i += BATCH_SIZE) {
    batches.push(importLines.slice(i, i + BATCH_SIZE));
  }

  const batchBlocks = batches
    .map((batch, idx) => {
      const promiseAll = `  await Promise.all([\n${batch.join(',\n')}\n  ]);`;
      if (idx < batches.length - 1) {
        return `${promiseAll}\n  await new Promise(r => setTimeout(r, 0));`;
      }
      return promiseAll;
    })
    .join('\n');

  const content = `// Auto-generated unified entry for Kibana RSPack build
// Plugin list hash: ${pluginListHash}
// Generated at: ${new Date().toISOString()}
//
// ALL-ASYNC STRATEGY:
// 1. Core + all plugins loaded in parallel via dynamic import()
// 2. Each target gets a webpackChunkName; same-plugin targets merge into one chunk
// 3. RSPack naturally splits shared code via splitChunks cache groups
// 4. kibana.bundle.js is just the runtime + orchestration shell
//
// TBT MITIGATION:
// With eager chunk loading, all chunks are pre-loaded via the bootstrap load()
// array. When this entry runs, every import() resolves instantly (modules already
// in JSONP queue), concentrating all ~220 plugin factory executions into one
// macrotask. To prevent a single long blocking task, imports are batched with
// setTimeout(0) yielding between groups of ${BATCH_SIZE}.

// Verify __kbnBundles__ is available
if (typeof __kbnBundles__ === 'undefined' || typeof __kbnBundles__.define !== 'function') {
  throw new Error('__kbnBundles__ is not defined');
}

// IMPORTANT: registerPlugin receives the FULL module namespace object and
// passes it to __kbnBundles__.define(), which is a global defined outside
// this bundle graph. This ensures all plugin exports are preserved even if
// they appear unused within the unified compilation -- external third-party
// plugins (built separately) consume these exports at runtime via
// __kbnBundles__.get(). In-graph cross-plugin imports work via normal
// module resolution and benefit from tree-shaking as usual.
function registerPlugin(bundleId, moduleExports) {
  __kbnBundles__.define(bundleId, () => moduleExports, bundleId);
}

// ============================================
// All bundles (core + plugins) loaded in parallel via batched async imports
// ============================================
// Core is loaded as "plugin-core" alongside all other plugins.
// Batches of ${BATCH_SIZE} imports run in parallel within each batch, with a
// setTimeout(0) yield between batches to break up the long task.
window.__kbnPluginsLoaded = (async () => {
  try {
    var metaEl = document.querySelector('kbn-injected-metadata');
    if (metaEl && typeof __kbnSharedDeps__ !== 'undefined') {
      var meta = JSON.parse(metaEl.getAttribute('data'));
      if (meta.i18n && meta.i18n.translationsUrl) {
        await __kbnSharedDeps__.KbnI18n.i18n.load(meta.i18n.translationsUrl);
      }
    }
  } catch (e) {
    // Non-fatal: plugins will load with English defaults
  }
${batchBlocks}
  console.log('[@kbn/rspack-optimizer] All plugins loaded');
})().catch(err => {
  console.error('[@kbn/rspack-optimizer] Failed to load plugins:', err);
  throw err;
});
`;

  Fs.writeFileSync(unifiedEntryPath, content);
  return unifiedEntryPath;
}
