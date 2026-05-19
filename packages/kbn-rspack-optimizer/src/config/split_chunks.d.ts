import type { OptimizationSplitChunksOptions } from '@rspack/core';
type CacheGroups = NonNullable<OptimizationSplitChunksOptions['cacheGroups']>;
/**
 * Return the splitChunks cache groups used by the unified single-compilation
 * build.  Extracted here so that both the build config and the limits
 * validation code can derive the set of named shared chunk names from the
 * same source of truth.
 *
 * CACHE GROUP PRIORITY ORDER (highest wins):
 *   45: vendorsHeavy     - specific heavy node_modules
 *   40: vendors          - /node_modules/ (minChunks: 3)
 *   35: sharedPlugins    - /plugins/  (all cross-plugin shared code)
 *   32: corePackages     - /src/core/packages/
 *   31: sharedPackages   - /packages/(shared|private)/  (platform packages)
 *   30: solutionPackages - /solutions/* /packages/
 *   29: rootPackages     - /packages/kbn-/  (repo root + x-pack/packages)
 *  -20: default          - catch-all (minChunks: 3, name: 'shared-misc')
 *
 * All groups use category-level static names.  No maxSize — benchmarked
 * at 500K/1M/6M/10M/20M (global and per-group); all caused regressions.
 */
export declare const getSplitChunksCacheGroups: () => CacheGroups;
/**
 * Derive the set of named shared chunk names from the cache groups config.
 * Used by BundleMetricsPlugin (to identify shared chunks vs the `kibana`
 * entry chunk) and by validateLimitsForAllBundles (to tolerate shared chunk
 * entries in limits.yml).
 */
export declare const getSharedChunkNames: () => Set<string>;
export {};
