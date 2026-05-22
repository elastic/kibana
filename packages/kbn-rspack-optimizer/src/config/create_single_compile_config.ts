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
import { rspack, type Configuration } from '@rspack/core';
import type { ToolingLog } from '@kbn/tooling-log';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import { DEFAULT_THEME_TAGS } from '@kbn/core-ui-settings-common';
import { discoverPlugins } from '../utils/plugin_discovery';
import {
  findTargetEntry,
  collectPluginEntries,
  createUnifiedEntry,
} from '../utils/entry_generation';
import { resolveBundlesDir, resolveEntryWrappersDir } from '../paths';
import { loadDllManifest } from './dll_manifest';
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
  computeConfigHash,
  getMinimizer,
} from './shared_config';
import type { ThemeTag } from '../types';
import {
  signalShutdown,
  resetShutdown,
  createLogProgressPlugin,
} from '../plugins/log_progress_plugin';
import { XPackBannerPlugin } from '../plugins/xpack_banner_plugin';
import { BundleMetricsPlugin, type PluginMetricsInfo } from '../plugins/bundle_metrics_plugin';
import { ChunkPreloadManifestPlugin } from '../plugins/chunk_preload_manifest_plugin';
import { readLimits, DEFAULT_LIMITS_PATH } from '../limits';
import { getSplitChunksCacheGroups, getSharedChunkNames } from './split_chunks';
import { EmitStatsPlugin, type FocusPluginInfo } from '../plugins/emit_stats_plugin';
import { CrossPluginTargetValidationPlugin } from '../plugins/cross_plugin_target_validation_plugin';
import { PluginWatchPlugin } from '../plugins/plugin_watch_plugin';

export { signalShutdown, resetShutdown };
export { findTargetEntry };

/**
 * Files that affect the main Kibana RSPack build. Used as the single source of
 * truth for both computeConfigHash (version string) and buildDependencies so they
 * stay in sync. Repo-relative paths are resolved against repoRoot; absolute
 * paths (like the DLL manifest) are used as-is by Path.resolve.
 */
const CACHE_CONFIG_FILES = [
  'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts',
  'packages/kbn-rspack-optimizer/src/config/shared_config.ts',
  'packages/kbn-rspack-optimizer/src/config/externals.ts',
  'packages/kbn-rspack-optimizer/src/loaders/theme_loader.ts',
  'packages/kbn-rspack-optimizer/src/loaders/require_interop_loader.ts',
  'packages/kbn-rspack-optimizer/src/loaders/hmr_boundary_loader.ts',
  'packages/kbn-rspack-optimizer/src/plugins/xpack_banner_plugin.ts',
  'packages/kbn-rspack-optimizer/src/plugins/bundle_metrics_plugin.ts',
  'packages/kbn-rspack-optimizer/src/plugins/chunk_preload_manifest_plugin.ts',
  'packages/kbn-rspack-optimizer/limits.yml',
  'packages/kbn-swc-config/src/browser.ts',
  'packages/kbn-transpiler-config/src/shared_config.ts',
  'package.json',
  UiSharedDepsNpm.dllManifestPath,
];

export interface SingleCompileConfigOptions {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  cache?: boolean;
  examples?: boolean;
  testPlugins?: boolean;
  themeTags?: ThemeTag[];
  /** ToolingLog instance for consistent logging with Kibana's dev mode */
  log?: ToolingLog;
  /** Enable profiling - writes stats.json and enables RsDoctor */
  profile?: boolean;
  /** Skip RsDoctor, only generate stats.json (faster) */
  profileStatsOnly?: boolean;
  /** Plugin IDs for focused stats.json with module-level detail (requires profile) */
  profileFocus?: string[];
  /** Enable Hot Module Replacement (resolved by caller via isHmrEnabled) */
  hmr?: boolean;
  /** Port the HMR SSE server is listening on (required when hmr=true) */
  hmrPort?: number;
  /** Override the limits.yml path (default: packages/kbn-rspack-optimizer/limits.yml) */
  limitsPath?: string;
}

/**
 * Create a SINGLE RSPack configuration that builds ALL plugins together.
 *
 * Benefits:
 * - One compilation = faster, less memory
 * - Shared deps parsed only once
 * - All plugins output to their respective target/public directories
 * - Compatible with external plugin builds using same externals
 */
export async function createSingleCompileConfig(
  options: SingleCompileConfigOptions
): Promise<Configuration> {
  const {
    repoRoot,
    outputRoot = repoRoot,
    dist = false,
    watch = false,
    cache = true,
    examples = false,
    testPlugins = false,
    themeTags = [...DEFAULT_THEME_TAGS],
    log,
    profile = false,
    profileStatsOnly = false,
    profileFocus,
    hmr = false,
    hmrPort,
    limitsPath = DEFAULT_LIMITS_PATH,
  } = options;

  if (hmr && hmrPort == null) {
    throw new Error(
      'hmrPort is required when hmr is enabled — the HMR SSE server must be started and its port passed to createSingleCompileConfig'
    );
  }
  const resolvedHmrPort = hmrPort as number;

  // Discover all plugins
  const plugins = await discoverPlugins({
    repoRoot,
    examples,
    testPlugins,
  });

  // Create a SINGLE unified entry that imports ALL plugins
  // This ensures RSPack can properly deduplicate modules across all plugins
  const wrapperDir = resolveEntryWrappersDir(outputRoot);
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  // Collect all plugin entries (core + plugins)
  const pluginEntries = collectPluginEntries(repoRoot, plugins);

  // Create unified entry that imports and registers all plugins
  // Uses relative paths for cache portability across machines
  const unifiedEntryPath = createUnifiedEntry(wrapperDir, repoRoot, pluginEntries);

  const extraTargets = pluginEntries.length - 1 - plugins.length;
  if (log) {
    log.info(
      `Unified compilation: ${pluginEntries.length} bundles (core + ${plugins.length} plugins${
        extraTargets > 0 ? `, ${extraTargets} extra targets` : ''
      })`
    );
    if (hmr) {
      log.info(`HMR enabled (port ${resolvedHmrPort})`);
    }
  }

  // Collect plugin manifest paths for watching
  const pluginManifests = plugins.map((p) => Path.join(p.contextDir, 'kibana.jsonc'));

  // Get externals for shared deps
  const sharedDepsExternals = getExternals();

  // Note: In single compilation mode, cross-plugin imports are NOT externalized.
  // This allows RSPack to properly deduplicate modules and ensures services
  // are initialized in the correct order. The `externals` only covers
  // npm packages from @kbn/ui-shared-deps.

  const bundlesDir = resolveBundlesDir(outputRoot);

  return {
    name: 'kibana',
    mode: dist ? 'production' : 'development',
    // No sourcemaps in dist; cheap-module-source-map in dev for original-source
    // quality (maps through SWC back to TypeScript/TSX). Aligns with rspack's
    // new recommended dev default (PR #12934).
    devtool: dist ? false : 'cheap-module-source-map',
    // ES2020 target auto-sets output.environment for modern JS in rspack's
    // generated runtime code (arrow functions, const, destructuring, etc.).
    // Safe because SWC already targets ES2020 and .browserslistrc requires it.
    target: ['web', 'es2020'],
    context: repoRoot,

    entry: {
      // Single entry point that imports all plugins
      // When HMR is enabled, prepend the HMR client for SSE-based update notifications
      kibana: hmr
        ? [Path.resolve(__dirname, '../hmr/hmr_client.js'), unifiedEntryPath]
        : unifiedEntryPath,
    },

    output: {
      // Output to a central location
      path: bundlesDir,
      // Single unified bundle (with [name] for runtimeChunk compatibility)
      filename: '[name].bundle.js',
      // Async chunks: include [name] in production so filenames stay attributable (Scout perf,
      // debugging, cache busting via contenthash). Hash-only names broke bundle label inference.
      chunkFilename: 'chunks/[name].[contenthash:8].js',
      // Use 'auto' to dynamically resolve publicPath at runtime based on document.currentScript
      publicPath: 'auto',
      clean: !watch,
      uniqueName: 'kibana-bundle',
      pathinfo: false,
      ...(dist ? {} : { devtoolModuleFilenameTemplate: 'kibana:///[resource-path]' }),
    },

    // Only externalize shared deps (npm packages), NOT cross-plugin imports
    // In single compilation mode, cross-plugin imports are bundled together
    // This ensures proper module deduplication and service initialization order
    externals: sharedDepsExternals,

    // Use shared resolve config (same as external plugins)
    resolve: {
      ...getSharedResolveConfig(repoRoot),
      // In dev mode, skip symlink resolution. All @kbn/* imports are resolved
      // via tsConfig (tsconfig.base.json with 2600+ path aliases), so following
      // symlinks adds redundant filesystem I/O for 50K+ modules.
      // CAVEAT: If Kibana adopts Yarn workspaces with symlinked packages in
      // node_modules/, this would need to be revisited since symlink-based
      // resolution of workspace packages by npm name would break.
      ...(dist ? {} : { symlinks: false }),
      // Additional fallbacks for node:-prefixed modules
      fallback: getSharedResolveFallback(),
    },

    module: {
      noParse: [/[\\/]node_modules[\\/]lodash[\\/]index\.js$/],
      // Use shared module rules (same loaders as external plugins)
      // Plus additional rules specific to main build
      // SWC for performance + require_interop_loader for ESM/CJS interop
      rules: [
        ...getSharedModuleRules(repoRoot, dist, themeTags, 'kibana', false, hmr),
        // URL imports (?asUrl query) - specific to main build
        {
          resourceQuery: /asUrl/,
          type: 'asset/resource',
        },
      ],
      // In dev mode, cache ALL module resolution results (not just node_modules).
      // Matches legacy webpack optimizer behavior (webpack.config.ts line 342).
      // Default is /[\\/]node_modules[\\/]/ which re-validates all 50K+ source
      // modules on each access. Dev-only: persistent cache handles cross-restart
      // invalidation; within a single build, module resolution is deterministic.
      ...(dist ? {} : { unsafeCache: true }),
    },

    optimization: {
      removeAvailableModules: dist,
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      // Skip sideEffects analysis in dev mode (matches legacy webpack optimizer).
      // In dev, tree shaking overhead is wasted since bundles aren't minified.
      // In dist, defaults to true (rspack default).
      sideEffects: dist,
      usedExports: dist,
      concatenateModules: dist,
      // Chunk splitting strategy for the single-compilation build.
      //
      // In single compilation, all 200+ plugins share one module graph.
      // Without named cache groups, splitChunks fragments shared modules
      // across thousands of consumer-combination chunks (e.g., kibana_utils
      // duplicated 137 times). Named groups with `name` functions override
      // this by consolidating modules by SOURCE origin instead.
      //
      // `chunks: 'async'` means splitChunks only operates on async chunks.
      // kibana.bundle.js (the initial chunk) is just the rspack runtime +
      // orchestration shell; core and all plugins are async chunks.
      // `chunks: 'all'` was evaluated and rejected -- it breaks bundle
      // metrics for core and the synchronous core contracts require a
      // single contiguous initial script.
      //
      // `minChunks: 3` ensures only modules shared by 3+ async chunks are
      // extracted (no single-consumer shared chunks). `enforce` is NOT used
      // so that minChunks is respected -- A/B testing confirmed this has
      // negligible impact on build speed while preventing unnecessary chunk
      // fragmentation. Named groups use `minSize: 0` to extract ALL shared
      // modules regardless of size, preventing small-module duplication
      // across consuming plugins. The global `minSize: 20000` still applies
      // to `vendors`, `vendorsHeavy`, and `default` catch-all groups.
      //
      // Cache groups are defined in split_chunks.ts — single source of truth
      // shared with limits validation and BundleMetricsPlugin.
      splitChunks: {
        chunks: 'async',
        minSize: 20000,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: getSplitChunksCacheGroups(),
      },
      // Runtime is embedded in the main entry bundle (kibana.bundle.js)
      // Async chunks do NOT contain runtime - they use JSONP to register modules
      runtimeChunk: false,
      // Production optimizations
      minimize: dist,
      minimizer: getMinimizer(dist),
    },

    // Enable in-memory caching
    cache,

    // Experimental features
    experiments: {
      // Persistent cache for faster rebuilds between restarts
      cache: cache
        ? {
            type: 'persistent',
            // Treat node_modules/ as package-manager-managed. Rspack skips
            // per-file stats during cache validation and relies on package.json
            // changes (captured by buildDependencies below) instead.
            snapshot: {
              managedPaths: [Path.resolve(repoRoot, 'node_modules')],
            },
            buildDependencies: CACHE_CONFIG_FILES.map((f) => Path.resolve(repoRoot, f)),
            // Version includes hash of this config file for reliable invalidation
            // RSPack's buildDependencies may not trigger on TypeScript file changes
            version: `v8-${dist ? 'prod' : 'dev'}-${computeConfigHash(
              repoRoot,
              CACHE_CONFIG_FILES
            )}`,
            // Use separate cache directories for dev vs dist to avoid stale cache issues
            // Structure: .rspack-cache/dev or .rspack-cache/dist
            // Clear all: rm -rf node_modules/.cache/.rspack-cache
            storage: {
              type: 'filesystem',
              directory: Path.resolve(
                repoRoot,
                'node_modules/.cache/.rspack-cache',
                dist ? 'dist' : 'dev'
              ),
            },
          }
        : false,
    },

    // Enable profiling in the RSPack config itself
    profile,

    plugins: [
      // Node.js browser polyfills (same as kbn-optimizer)
      new NodeLibsBrowserPlugin() as any,

      // Reference the pre-built @kbn/ui-shared-deps-npm DLL so that transitive
      // dependencies (babel helpers, core-js polyfills, internal sub-modules of
      // shared packages) are resolved from __kbnSharedDeps_npm__ instead of
      // being re-bundled into every plugin chunk.
      new rspack.DllReferencePlugin({
        context: repoRoot,
        manifest: loadDllManifest(),
      }),

      // Define environment variables
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
        // Match legacy webpack - used for conditional code in plugins
        'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify(dist ? 'true' : 'false'),
        ...(hmr ? { __KBN_HMR_PORT__: JSON.stringify(resolvedHmrPort) } : {}),
      }),

      // Elastic License 2.0 banner for x-pack plugin chunks (dist only)
      ...(dist ? [new XPackBannerPlugin(repoRoot, plugins)] : []),

      // Cross-plugin target validation (dist only) -- catches transitive
      // cross-plugin imports to undeclared targets that the ESLint rule
      // cannot detect (e.g. public/ -> same-plugin common/ -> other-plugin common/).
      ...(dist ? [new CrossPluginTargetValidationPlugin(plugins)] : []),

      // Emit chunk-manifest.json with allChunks (for eager loading via the
      // bootstrap load() array)
      new ChunkPreloadManifestPlugin(),

      // Bundle metrics -- collects per-plugin sizes and module counts, emits metrics.json
      ...(dist
        ? (() => {
            const limits = readLimits(limitsPath);
            const metricsInfos: PluginMetricsInfo[] = [
              {
                id: 'core',
                chunkName: 'plugin-core',
                limit: limits.pageLoadAssetSize?.core,
                ignoreMetrics: false,
              },
              ...plugins
                .filter((p) => !p.ignoreMetrics)
                .map((p) => ({
                  id: p.id,
                  chunkName: `plugin-${p.id}`,
                  limit: limits.pageLoadAssetSize?.[p.id],
                  ignoreMetrics: false,
                })),
            ];

            const sharedChunkNames = getSharedChunkNames();
            const sharedChunkLimits = new Map<string, number>();
            for (const [id, limit] of Object.entries(limits.pageLoadAssetSize ?? {})) {
              if (sharedChunkNames.has(id) && limit != null) {
                sharedChunkLimits.set(id, limit);
              }
            }

            return [new BundleMetricsPlugin(metricsInfos, sharedChunkNames, sharedChunkLimits)];
          })()
        : []),

      // HMR plugins -- enabled in watch dev mode
      ...(hmr
        ? [
            new rspack.HotModuleReplacementPlugin(),
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            new (require('@rspack/plugin-react-refresh').ReactRefreshRspackPlugin)({
              overlay: false,
            }),
          ]
        : []),

      // Progress reporting - use log-based progress instead of dynamic terminal updates
      // This avoids terminal state issues on Ctrl+C
      createLogProgressPlugin(log),

      // Watch plugin manifests and regenerate entry when plugins are added/removed
      ...(watch ? [new PluginWatchPlugin(pluginManifests, options, wrapperDir)] : []),

      // Profiling plugins - enabled with --profile flag
      ...(profile
        ? [
            new EmitStatsPlugin(
              bundlesDir,
              log,
              profileFocus
                ? profileFocus
                    .map((id) => {
                      const plugin = plugins.find((p) => p.id === id);
                      return plugin ? { id: plugin.id, contextDir: plugin.contextDir } : undefined;
                    })
                    .filter((p): p is FocusPluginInfo => p !== undefined)
                : undefined
            ),
          ]
        : []),

      // RsDoctor profiling - only works in the profile worker (avoids require-in-the-middle conflict)
      // Skip if profileStatsOnly is enabled (faster builds when only stats.json is needed)
      ...(profile && !profileStatsOnly
        ? (() => {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const { RsdoctorRspackPlugin } = require('@rsdoctor/rspack-plugin');
              log?.info('Enabling RsDoctor bundle analysis...');
              return [
                new RsdoctorRspackPlugin({
                  // Don't auto-open browser - user can run CLI command manually
                  disableClientServer: true,
                  supports: {
                    // Enable bundle analysis
                    bundleAnalyze: true,
                  },
                }),
              ];
            } catch (e: any) {
              // RsDoctor's envinfo dependency conflicts with require-in-the-middle (from harden)
              // This should only happen if running outside the profile worker
              log?.warning(`RsDoctor not available: ${e.message}`);
              log?.info('Use stats.json with https://statoscope.tech for bundle analysis');
              return [];
            }
          })()
        : []),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },

    // Use shared ignore warnings (same as external plugins)
    ignoreWarnings: getSharedIgnoreWarnings(),
  };
}
