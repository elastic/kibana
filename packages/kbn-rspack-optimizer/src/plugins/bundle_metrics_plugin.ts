/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rspack, type Compiler, type Chunk } from '@rspack/core';
import type { CiStatsMetric } from '@kbn/ci-stats-reporter';
import { METRICS_FILENAME } from '../paths';

/**
 * Per-plugin/core metrics info used internally by BundleMetricsPlugin.
 *
 * `id` is the user-facing identifier that appears in metrics.json, limits.yml,
 * CI stats, and user-facing logs (e.g. "core", "discover").
 *
 * `chunkName` is the internal rspack chunk name used to match against
 * `compilation.chunks` (e.g. "plugin-core" for core, "plugin-discover" for discover).
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
 *    bundle (core + plugins) gets a named async chunk via `webpackChunkName`
 *    magic comments in the unified entry (e.g. `plugin-core`, `plugin-discover`,
 *    `plugin-dashboard`). The `kibana` entry chunk is just the rspack runtime
 *    + the Promise.all orchestration shell.
 *
 *    `pageLoadAssetSize` (the limit) tracks the synchronous page-load cost
 *    of each plugin's named chunk -- the size of the chunk the browser must
 *    download and parse as part of the initial page load sequence.
 *
 *    Named shared chunks produced by `splitChunks` (e.g. `shared-core`,
 *    `shared-plugins`, `vendors`, `vendors-heavy`) are tracked individually
 *    with their own `pageLoadAssetSize` entries in limits.yml. They are
 *    identified by matching `chunk.name` against `sharedChunkNames` (derived
 *    from `getSplitChunksCacheGroups()` in `split_chunks.ts`). This ensures
 *    the `kibana` entry chunk (name: `'kibana'`) is NOT captured -- it stays
 *    in the aggregate.
 *
 *    The `kibana` entry chunk is counted in `shared chunks total size`.
 *    Unnamed async chunks are attributed via exclusive-ownership (see
 *    section 3) to per-plugin `async chunks size` or the `shared async
 *    chunks total size` aggregate.
 *
 * 2. CORE vs PLUGIN CHUNK NAMING
 *
 *    Core maps to `chunkName: 'plugin-core'` (loaded via dynamic import(),
 *    same as plugins). Plugins map to `chunkName: 'plugin-{id}'`. The
 *    user-facing `id` (e.g. "core", "discover") differs from the internal
 *    `chunkName` to match legacy metrics format and limits.yml keys.
 *
 * 3. ASYNC CHUNK TRAVERSAL (exclusive-ownership attribution)
 *
 *    All bundles (core + plugins) call `chunk.getAllAsyncChunks()` which
 *    walks child chunk groups recursively. In the unified compilation this
 *    returns named shared chunks (`shared-plugins`, `vendors`, etc.),
 *    other plugin entry chunks, and unnamed async splits.
 *
 *    Only unnamed chunks (those with `chunk.name` falsy) pass through the
 *    async filter. ALL named chunks are excluded because they are already
 *    tracked elsewhere: plugin entries in per-plugin `page load bundle
 *    size`, named shared chunks individually, and any other named chunks
 *    (e.g. the `kibana` entry) in `shared chunks total size`.
 *
 *    A two-pass exclusive-ownership attribution determines where each
 *    unnamed chunk is counted:
 *
 *      Phase 1 — Collect each plugin's reachable unnamed async chunks.
 *      Phase 2 — Build a claim-count map: for each unnamed chunk, how
 *                many plugins can reach it?
 *      Phase 3 — Attribute:
 *        - claim === 1 (exclusive):  counted in that plugin's `asyncSize`.
 *        - claim === 0 (orphan):     counted in `shared async chunks total size`.
 *        - claim >= 2 (shared):      counted in `shared async chunks total size`.
 *
 *    This ensures every unnamed async byte is counted exactly once. The
 *    Map keys are chunk object references (identity), which rspack
 *    guarantees are the same objects in `compilation.chunks` and in the
 *    results of `getAllAsyncChunks()`.
 *    Core (`plugin-core`) receives the same treatment as any plugin.
 *
 * 4. ENTRY CHUNK (kibana.bundle.js)
 *
 *    `kibana.bundle.js` contains only the rspack runtime and the Promise.all
 *    orchestration code. It does not match any `chunkNameToInfo` entry and is
 *    counted as shared aggregate. Its size is negligible.
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
 *    `shared chunks total size` and `shared chunk count` track all named
 *    chunks that are NOT plugin entries and NOT splitChunks shared chunks.
 *    This includes the `kibana` entry chunk (runtime + orchestration) and
 *    all developer-named async chunks created via `webpackChunkName` magic
 *    comments (e.g. connector icons, security_solution lazy sub-plugins,
 *    APM dashboard chunks). In a typical dist build this is ~69 chunks /
 *    ~6.6MB. Named shared chunks (e.g. `shared-core`, `vendors`) are
 *    tracked individually via `page load bundle size` with their own limits.
 *
 *    `shared async chunks total size` and `shared async chunk count` track
 *    unnamed async chunks that are reachable from 2+ plugins (multi-consumer)
 *    or from no plugin at all (orphan). Exclusive unnamed chunks (reachable
 *    from exactly one plugin) are counted in that plugin's `async chunks
 *    size` instead.
 *
 *    `total optimizer output size` sums all emitted JS and catches overall
 *    build growth. All aggregate metrics are purely informational (no
 *    limits). They do NOT include UI shared deps (`@kbn/ui-shared-deps-npm`,
 *    `@kbn/ui-shared-deps-src`) which are built by separate tooling.
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
  sharedAsyncStats: { totalSize: number; count: number },
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
    group: 'shared async chunks total size',
    id: 'all',
    value: sharedAsyncStats.totalSize,
  });
  metrics.push({
    group: 'shared async chunk count',
    id: 'all',
    value: sharedAsyncStats.count,
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
    private readonly sharedChunkNames: Set<string>,
    private readonly sharedChunkLimits?: Map<string, number>
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
          const namedSharedData: typeof entryData = [];

          // ── Phase 1: collect per-plugin data + defer unnamed chunks ──
          const pluginCollected = new Map<
            string,
            {
              info: PluginMetricsInfo;
              pageLoadSize: number;
              moduleCount: number;
              miscSize: number;
              asyncChunks: Chunk[];
            }
          >();
          const deferredChunks: Chunk[] = [];

          for (const chunk of compilation.chunks) {
            const info = chunk.name ? this.chunkNameToInfo.get(chunk.name) : undefined;

            if (!info) {
              const jsSize = sumJsFileSize(chunk.files, compilation);
              if (chunk.name && this.sharedChunkNames.has(chunk.name)) {
                namedSharedData.push({
                  id: chunk.name,
                  chunkName: chunk.name,
                  limit: this.sharedChunkLimits?.get(chunk.name),
                  pageLoadSize: jsSize,
                  moduleCount: compilation.chunkGraph.getChunkModules(chunk).length,
                  asyncSize: 0,
                  asyncCount: 0,
                  miscSize: 0,
                });
              } else if (chunk.name) {
                totalSharedSize += jsSize;
                sharedChunkCount++;
              } else {
                deferredChunks.push(chunk);
              }
              continue;
            }

            if (info.ignoreMetrics) {
              continue;
            }

            const pageLoadSize = sumJsFileSize(chunk.files, compilation);
            const moduleCount = compilation.chunkGraph.getChunkModules(chunk).length;

            const allAsync = new Set(chunk.getAllAsyncChunks());
            const asyncChunks = [...allAsync].filter((c) => !c.name);

            let miscSize = 0;
            for (const auxFile of chunk.auxiliaryFiles) {
              const ext = Path.extname(auxFile);
              if (IGNORED_EXTNAME.includes(ext)) continue;
              const asset = compilation.getAsset(auxFile);
              miscSize += asset ? asset.source.size() : 0;
            }

            pluginCollected.set(info.chunkName, {
              info,
              pageLoadSize,
              moduleCount,
              miscSize,
              asyncChunks,
            });
          }

          // ── Phase 2: build claim-count map ──
          const chunkClaimCount = new Map<Chunk, number>();
          for (const [, data] of pluginCollected) {
            for (const ac of data.asyncChunks) {
              chunkClaimCount.set(ac, (chunkClaimCount.get(ac) ?? 0) + 1);
            }
          }

          // ── Phase 3: attribute exclusive async + categorise deferred ──
          for (const [, data] of pluginCollected) {
            const exclusive = data.asyncChunks.filter((c) => chunkClaimCount.get(c) === 1);
            entryData.push({
              id: data.info.id,
              chunkName: data.info.chunkName,
              limit: data.info.limit,
              pageLoadSize: data.pageLoadSize,
              moduleCount: data.moduleCount,
              asyncSize: sumJsFileSize(
                exclusive.flatMap((c) => [...c.files]),
                compilation
              ),
              asyncCount: exclusive.length,
              miscSize: data.miscSize,
            });
          }

          let sharedAsyncSize = 0;
          let sharedAsyncCount = 0;
          for (const chunk of deferredChunks) {
            const claim = chunkClaimCount.get(chunk) ?? 0;
            if (claim === 1) continue;
            sharedAsyncSize += sumJsFileSize(chunk.files, compilation);
            sharedAsyncCount++;
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

          // Merge named shared chunks into the entry data
          entryData.push(...namedSharedData);

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
            { totalSize: sharedAsyncSize, count: sharedAsyncCount },
            totalOutputSize
          );

          compilation.emitAsset(
            METRICS_FILENAME,
            new rspack.sources.RawSource(JSON.stringify(metrics, null, 2))
          );
        }
      );
    });
  }
}
