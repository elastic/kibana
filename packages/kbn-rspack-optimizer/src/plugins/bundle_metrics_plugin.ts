/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rspack, type Compiler, type Chunk, type ChunkGroup } from '@rspack/core';
import type { CiStatsMetric } from '@kbn/ci-stats-reporter';

/**
 * Per-plugin/core metrics info used internally by BundleMetricsPlugin.
 *
 * `id` is the user-facing identifier that appears in metrics.json, limits.yml,
 * CI stats, and user-facing logs (e.g. "core", "discover").
 *
 * `chunkName` is the internal rspack chunk name used to match against
 * `compilation.chunks` (e.g. "kibana" for core, "plugin-discover" for discover).
 */
export interface PluginMetricsInfo {
  id: string;
  chunkName: string;
  limit?: number;
  ignoreMetrics: boolean;
}

/*
 * =============================================================================
 * DESIGN DECISIONS
 * =============================================================================
 *
 * 1. SINGLE-COMPILATION METRIC ATTRIBUTION STRATEGY
 *
 *    The rspack optimizer produces a single compilation for all plugins. Each
 *    plugin gets a named async chunk via `webpackChunkName` magic comments in
 *    the unified entry (e.g. `plugin-discover`, `plugin-dashboard`). Core is
 *    loaded synchronously into the `kibana` entry chunk. Shared/split chunks
 *    produced by `splitChunks` (e.g. `vendors-heavy`, `default`) are NOT
 *    attributed to any single plugin -- they benefit all consumers and are
 *    tracked separately as aggregate metrics.
 *
 * 2. CORE vs PLUGIN CHUNK NAMING
 *
 *    Core maps to `chunkName: 'kibana'` because it's imported synchronously
 *    into the entry, not via `import()`. Plugins map to `chunkName: 'plugin-{id}'`
 *    because each uses `import(/* webpackChunkName: "plugin-{id}" *​/)`. The
 *    user-facing `id` (e.g. "core", "discover") differs from the internal
 *    `chunkName` to match legacy metrics format and limits.yml keys.
 *
 * 3. ASYNC CHUNK TRAVERSAL
 *
 *    For plugins: `chunk.getAllAsyncChunks()` walks child chunk groups
 *    recursively and returns all downstream async chunks. If `splitChunks`
 *    extracts shared code, that chunk appears in multiple plugins' results --
 *    semantically correct as it represents per-plugin download cost.
 *
 *    For core: calling `getAllAsyncChunks()` on the `kibana` chunk would
 *    return everything (all plugins + their async children). Instead, we walk
 *    `entrypoint.childrenIterable`, skip groups named `plugin-*`, and
 *    recursively collect chunks from the remaining unnamed groups (core's own
 *    lazy imports like `@elastic/apm-rum`, `react-markdown`).
 *
 * 4. ENTRY WRAPPER OVERHEAD
 *
 *    `kibana.bundle.js` includes core's code, the rspack runtime, and the
 *    entry wrapper (~few hundred bytes minified, <0.02% of core's ~2.8MB).
 *    We do NOT discount it because it IS real download cost, the runtime IS
 *    necessary, and legacy also included each plugin's webpack runtime in
 *    page-load measurement.
 *
 * 5. MISCELLANEOUS ASSETS
 *
 *    `chunk.auxiliaryFiles` maps to legacy's "miscellaneous assets" concept
 *    (non-JS assets like images/fonts via `asset/resource`). With `style-loader`
 *    (CSS injected, not extracted), this is typically 0. We measure only the
 *    named chunk's auxiliaryFiles (not async children's) -- a negligible
 *    difference from legacy since auxiliary files from lazy modules are rare.
 *
 * 6. HOOK STAGE
 *
 *    `PROCESS_ASSETS_STAGE_ANALYSE` (stage 4000) runs AFTER `XPackBannerPlugin`
 *    (stage `PROCESS_ASSETS_STAGE_ADDITIONS` = 100), so sizes include license
 *    banners. This matches legacy's stage choice.
 *
 * 7. COMPARISON WITH LEGACY
 *
 *    Legacy used two plugins: `PopulateBundleCachePlugin` (counted modules at
 *    stage 500, stored in BundleCache) and `BundleMetricsPlugin` (read cache
 *    at stage 4000, emitted metrics.json). This plugin replaces both, using
 *    `compilation.chunkGraph.getChunkModules(chunk).length` directly.
 *
 * 8. MODULE COUNT GROUP NAME
 *
 *    Uses `@kbn/optimizer bundle module count` (same as legacy) to enable CI
 *    stats trend comparison against the on-merge baseline. Values will differ
 *    (rspack counts all module types; legacy was more selective), but since
 *    module count has no limit, no validation failures occur. This avoids a
 *    dead metric group with no baseline and eliminates a legacy removal step.
 *
 * 9. AGGREGATE SHARED CHUNK AND TOTAL OUTPUT METRICS
 *
 *    New metrics beyond legacy parity. `shared chunks total size` and
 *    `shared chunk count` track all unattributed chunks (splitChunks output),
 *    giving visibility into deduplication efficiency. `total optimizer output
 *    size` sums all emitted JS and catches overall build growth. These are
 *    purely informational (no limits). They do NOT include UI shared deps
 *    (`@kbn/ui-shared-deps-npm`, `@kbn/ui-shared-deps-src`) which are built
 *    by separate tooling with their own metrics tracking.
 *
 * 10. RSPACK API DIFFERENCES FROM WEBPACK 5
 *
 *    - `getAllAsyncChunks()` returns `Chunk[]` (not `Set<Chunk>`), requiring
 *      `new Set()` wrapping to deduplicate.
 *    - `Entrypoint` is a type alias for `ChunkGroup` (not a subclass).
 *    - `getAsset()` can return `void`; always guard with a null check.
 * =============================================================================
 */

const IGNORED_EXTNAME = ['.map', '.br', '.gz'];

const LIMITS_PATH_FOR_METRICS = 'packages/kbn-rspack-optimizer/limits.yml';

/**
 * Measure the total JS file size for a set of files from compilation assets.
 */
function sumJsFileSize(
  files: Iterable<string>,
  compilation: { getAsset(name: string): { source: { size(): number } } | void }
): number {
  let total = 0;
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const basename = Path.basename(file);
    if (basename.startsWith('.')) continue;
    if (IGNORED_EXTNAME.includes(Path.extname(basename))) continue;
    const asset = compilation.getAsset(file);
    total += asset ? asset.source.size() : 0;
  }
  return total;
}

/**
 * Recursively collect chunks from a chunk group and all its descendants.
 */
function collectChunksRecursive(group: ChunkGroup, result: Set<Chunk>): void {
  for (const chunk of group.chunks) {
    result.add(chunk);
  }
  for (const child of group.childrenIterable) {
    collectChunksRecursive(child, result);
  }
}

/**
 * Build the CiStatsMetric array from collected chunk data.
 * Extracted as a standalone function to enable unit testing without a full
 * rspack compilation.
 */
export function buildMetrics(
  entries: Array<{
    id: string;
    chunkName: string;
    limit?: number;
    pageLoadSize: number;
    moduleCount: number;
    asyncSize: number;
    asyncCount: number;
    miscSize: number;
  }>,
  sharedStats: { totalSize: number; count: number },
  totalOutputSize: number
): CiStatsMetric[] {
  const metrics: CiStatsMetric[] = [];

  for (const entry of entries) {
    metrics.push({
      group: '@kbn/optimizer bundle module count',
      id: entry.id,
      value: entry.moduleCount,
    });
    metrics.push({
      group: 'page load bundle size',
      id: entry.id,
      value: entry.pageLoadSize,
      limit: entry.limit,
      limitConfigPath: LIMITS_PATH_FOR_METRICS,
    });
    metrics.push({
      group: 'async chunks size',
      id: entry.id,
      value: entry.asyncSize,
    });
    metrics.push({
      group: 'async chunk count',
      id: entry.id,
      value: entry.asyncCount,
    });
    metrics.push({
      group: 'miscellaneous assets size',
      id: entry.id,
      value: entry.miscSize,
    });
  }

  metrics.push({
    group: 'shared chunks total size',
    id: 'all',
    value: sharedStats.totalSize,
  });
  metrics.push({
    group: 'shared chunk count',
    id: 'all',
    value: sharedStats.count,
  });
  metrics.push({
    group: 'total optimizer output size',
    id: 'all',
    value: totalOutputSize,
  });

  return metrics;
}

/**
 * Rspack plugin that collects per-plugin bundle metrics from the single
 * unified compilation and emits `metrics.json` as a compilation asset.
 *
 * Replaces legacy's `PopulateBundleCachePlugin` + `BundleMetricsPlugin`
 * with a single plugin that uses `ChunkGraph` APIs directly.
 */
export class BundleMetricsPlugin {
  private readonly chunkNameToInfo: Map<string, PluginMetricsInfo>;

  constructor(
    private readonly pluginInfos: PluginMetricsInfo[],
    private readonly limitsPath: string
  ) {
    this.chunkNameToInfo = new Map();
    for (const info of pluginInfos) {
      this.chunkNameToInfo.set(info.chunkName, info);
    }
  }

  apply(compiler: Compiler) {
    compiler.hooks.compilation.tap('BundleMetricsPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'BundleMetricsPlugin',
          stage: rspack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE,
        },
        () => {
          const pluginGroupNames = new Set(this.pluginInfos.map((p) => p.chunkName));

          const entryData: Array<{
            id: string;
            chunkName: string;
            limit?: number;
            pageLoadSize: number;
            moduleCount: number;
            asyncSize: number;
            asyncCount: number;
            miscSize: number;
          }> = [];

          let totalSharedSize = 0;
          let sharedChunkCount = 0;

          for (const chunk of compilation.chunks) {
            const info = chunk.name ? this.chunkNameToInfo.get(chunk.name) : undefined;

            if (!info) {
              // Shared/split chunk -- accumulate aggregate stats
              totalSharedSize += sumJsFileSize(chunk.files, compilation);
              sharedChunkCount++;
              continue;
            }

            if (info.ignoreMetrics) {
              continue;
            }

            const pageLoadSize = sumJsFileSize(chunk.files, compilation);
            const moduleCount = compilation.chunkGraph.getChunkModules(chunk).length;

            let asyncSize: number;
            let asyncCount: number;

            if (info.chunkName === 'kibana') {
              // Core: walk entry's child groups, skip plugin-loading groups
              const entrypoint = compilation.entrypoints.get('kibana');
              const coreAsyncChunks = new Set<Chunk>();
              if (entrypoint) {
                for (const childGroup of entrypoint.childrenIterable) {
                  if (childGroup.name && pluginGroupNames.has(childGroup.name)) {
                    continue;
                  }
                  collectChunksRecursive(childGroup, coreAsyncChunks);
                }
              }
              asyncSize = sumJsFileSize(
                [...coreAsyncChunks].flatMap((c) => [...c.files]),
                compilation
              );
              asyncCount = coreAsyncChunks.size;
            } else {
              // Plugin: use getAllAsyncChunks(), dedup with Set
              const asyncChunks = new Set(chunk.getAllAsyncChunks());
              asyncSize = sumJsFileSize(
                [...asyncChunks].flatMap((c) => [...c.files]),
                compilation
              );
              asyncCount = asyncChunks.size;
            }

            // Miscellaneous assets (non-JS auxiliary files)
            let miscSize = 0;
            for (const auxFile of chunk.auxiliaryFiles) {
              const ext = Path.extname(auxFile);
              if (IGNORED_EXTNAME.includes(ext)) continue;
              const asset = compilation.getAsset(auxFile);
              miscSize += asset ? asset.source.size() : 0;
            }

            entryData.push({
              id: info.id,
              chunkName: info.chunkName,
              limit: info.limit,
              pageLoadSize,
              moduleCount,
              asyncSize,
              asyncCount,
              miscSize,
            });
          }

          // Produce 0-value metrics for registered plugins whose entry chunks
          // were not found in the compilation. This happens when splitChunks
          // extracts ALL of a plugin's modules into shared chunks (e.g., every
          // module satisfies minChunks >= 2), leaving the entry chunk empty.
          // Rspack does not emit empty chunks, so they're absent from
          // compilation.chunks. The plugin still loads correctly (its shared
          // chunks are loaded as prerequisites), but we need 0-value entries
          // so that limits.yml stays in sync with discovered plugins.
          const foundChunkNames = new Set(entryData.map((e) => e.chunkName));
          for (const info of this.pluginInfos) {
            if (info.ignoreMetrics || foundChunkNames.has(info.chunkName)) continue;
            entryData.push({
              id: info.id,
              chunkName: info.chunkName,
              limit: info.limit,
              pageLoadSize: 0,
              moduleCount: 0,
              asyncSize: 0,
              asyncCount: 0,
              miscSize: 0,
            });
          }

          // Sort entries by id for deterministic output
          entryData.sort((a, b) => a.id.localeCompare(b.id));

          // Total optimizer output size: sum of all emitted JS assets
          let totalOutputSize = 0;
          for (const asset of compilation.getAssets()) {
            if (asset.name.endsWith('.js')) {
              totalOutputSize += asset.source.size();
            }
          }

          const metrics = buildMetrics(
            entryData,
            { totalSize: totalSharedSize, count: sharedChunkCount },
            totalOutputSize
          );

          compilation.emitAsset(
            'metrics.json',
            new rspack.sources.RawSource(JSON.stringify(metrics, null, 2))
          );
        }
      );
    });
  }
}
