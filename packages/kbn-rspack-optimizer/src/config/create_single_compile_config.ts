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
import {
  rspack,
  type Configuration,
  type Compiler,
  type RspackPluginInstance,
  type Module,
} from '@rspack/core';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  discoverPlugins,
  createCoreEntry,
  getPackageMapPath,
  type PluginEntry,
} from '../utils/plugin_discovery';
import { DLL_MANIFEST } from './dll_manifest';
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
} from './shared_config';
import type { ThemeTag } from '../types';
import { XPackBannerPlugin } from '../plugins/xpack_banner_plugin';
import { BundleMetricsPlugin, type PluginMetricsInfo } from '../plugins/bundle_metrics_plugin';
import { ChunkPreloadManifestPlugin } from '../plugins/chunk_preload_manifest_plugin';
import { readLimits, DEFAULT_LIMITS_PATH } from '../limits';

/**
 * Plugin to emit stats.json file for bundle analysis.
 * Used when profiling is enabled.
 *
 * Uses SYNCHRONOUS file writing to ensure stats are written before process exits.
 */
class EmitStatsPlugin {
  constructor(private readonly outputDir: string, private readonly log?: ToolingLog) {}

  apply(compiler: Compiler) {
    // Use 'afterDone' hook which fires after all 'done' hooks complete
    compiler.hooks.afterDone.tap('EmitStatsPlugin', (stats) => {
      const statsPath = Path.resolve(this.outputDir, 'stats.json');

      this.log?.info('Generating stats.json for bundle analysis...');

      try {
        // Ensure output directory exists
        if (!Fs.existsSync(this.outputDir)) {
          Fs.mkdirSync(this.outputDir, { recursive: true });
        }

        // Use minimal stats to avoid "Invalid string length" error
        // Full stats for 211 bundles exceeds JS string limit (~512MB)
        const minimalStats = {
          all: false,
          hash: true,
          version: true,
          timings: true,
          assets: true,
          chunks: true,
          chunkGroups: true,
          entrypoints: true,
          // Skip detailed module info - too large
          modules: false,
          reasons: false,
          chunkModules: false,
        };

        const jsonStats = stats.toJson(minimalStats);

        // Build JSON string piece by piece to avoid string length limits
        // Write synchronously to ensure completion before process exit
        const fd = Fs.openSync(statsPath, 'w');

        try {
          Fs.writeSync(fd, '{\n');

          const keys = Object.keys(jsonStats).filter(
            (key) => (jsonStats as any)[key] !== undefined
          );

          keys.forEach((key, index) => {
            const value = (jsonStats as any)[key];
            const isLast = index === keys.length - 1;

            try {
              const jsonValue = JSON.stringify(value);
              if (jsonValue !== undefined) {
                Fs.writeSync(fd, `  "${key}": ${jsonValue}${isLast ? '' : ','}\n`);
              }
            } catch {
              // Skip values that can't be stringified (circular refs, etc.)
            }
          });

          Fs.writeSync(fd, '}\n');
        } finally {
          Fs.closeSync(fd);
        }

        const fileSize = Fs.statSync(statsPath).size;
        this.log?.info(`Stats written to ${statsPath} (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      } catch (err: any) {
        this.log?.error(`Failed to generate stats: ${err.message}`);
      }
    });
  }
}

/**
 * Files that affect the main Kibana RSPack build. Used as the single source of
 * truth for both getConfigHash (version string) and buildDependencies so they
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
  'packages/kbn-rspack-optimizer/limits.yml',
  'packages/kbn-swc-config/src/browser.ts',
  'packages/kbn-transpiler-config/src/shared_config.ts',
  'package.json',
  UiSharedDepsNpm.dllManifestPath,
];

/**
 * Compute a hash of the config files that affect the build.
 * This ensures cache invalidation when config changes, since RSPack's
 * buildDependencies may not work correctly with TypeScript files.
 */
function getConfigHash(repoRoot: string): string {
  const hash = rspack.util.createHash('xxhash64');
  for (const file of CACHE_CONFIG_FILES) {
    try {
      hash.update(Fs.readFileSync(Path.resolve(repoRoot, file), 'utf-8'), 'utf-8');
    } catch {
      // File might not exist in some scenarios, skip
    }
  }
  return hash.digest('hex').slice(0, 8);
}

/**
 * Global shutdown flag - when set to true, RSPack logging will stop immediately.
 * This is used to prevent log output after Ctrl+C while RSPack finishes its current work.
 */
let isShuttingDown = false;

/**
 * Signal the RSPack optimizer to stop all logging immediately.
 * Call this when SIGINT/SIGTERM is received.
 */
export function signalShutdown(): void {
  isShuttingDown = true;
}

/**
 * Reset the shutdown flag (for testing or restart scenarios).
 */
export function resetShutdown(): void {
  isShuttingDown = false;
}

/**
 * Create a log-based progress plugin that doesn't use dynamic terminal updates.
 * This avoids terminal state issues when pressing Ctrl+C.
 *
 * Logging strategy:
 * - Logs at 5% intervals (more frequent feedback)
 * - Also logs if 3+ seconds have passed (never wait too long)
 * - Shows current stage (building, sealing, emitting, etc.)
 * - Shows elapsed time
 * - Immediately stops logging when shutdown is signaled
 *
 * @param log - ToolingLog instance for consistent formatting with Kibana's dev mode
 */
function createLogProgressPlugin(log?: ToolingLog): RspackPluginInstance {
  let lastLoggedPercent = -5;
  let lastLogTime = Date.now();
  let startTime = Date.now();
  let compilationCount = 0;

  const PERCENT_INTERVAL = 10;
  const TIME_INTERVAL_MS = 10000;

  const logInfo = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.info(message);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[@kbn/rspack-optimizer] ${message}`);
    }
  };

  const logDebug = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.debug(message);
    }
  };

  const logError = (message: string) => {
    if (isShuttingDown) return;
    if (log) {
      log.error(message);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[@kbn/rspack-optimizer] ${message}`);
    }
  };

  return {
    apply(compiler: Compiler) {
      compiler.hooks.compile.tap('LogProgressPlugin', () => {
        if (isShuttingDown) return;
        compilationCount++;
        startTime = Date.now();
        lastLogTime = Date.now();
        lastLoggedPercent = -PERCENT_INTERVAL;

        if (compilationCount === 1) {
          logInfo('Starting compilation...');
        }
      });

      new rspack.ProgressPlugin((percent: number, msg: string) => {
        if (isShuttingDown) return;
        // Only show progress details for the initial build
        if (compilationCount > 1) return;

        const percentInt = Math.floor(percent * 100);
        const now = Date.now();
        const timeSinceLastLog = now - lastLogTime;

        const nextMilestone =
          Math.ceil((lastLoggedPercent + 1) / PERCENT_INTERVAL) * PERCENT_INTERVAL;

        const hitPercentMilestone = percentInt >= nextMilestone;
        const hitTimeInterval =
          timeSinceLastLog >= TIME_INTERVAL_MS && percentInt > lastLoggedPercent;

        if (hitPercentMilestone || hitTimeInterval) {
          lastLoggedPercent = percentInt;
          lastLogTime = now;

          const stage = msg.split(' ')[0] || 'processing';
          const elapsed = ((now - startTime) / 1000).toFixed(1);

          logInfo(`${percentInt}% ${stage} [${elapsed}s]`);
        }
      }).apply(compiler);

      compiler.hooks.done.tap('LogProgressPlugin', (stats) => {
        if (isShuttingDown) return;
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (stats.hasErrors()) {
          if (compilationCount === 1) {
            logError(`Compilation failed [${elapsed}s]`);
          } else {
            logDebug(`Compilation failed [${elapsed}s]`);
          }
        } else if (compilationCount === 1) {
          logInfo(`Compilation complete [${elapsed}s]`);
        } else {
          logDebug(`Compilation complete [${elapsed}s]`);
        }
      });
    },
  };
}

export interface SingleCompileConfigOptions {
  repoRoot: string;
  outputRoot?: string;
  dist?: boolean;
  watch?: boolean;
  cache?: boolean;
  examples?: boolean;
  testPlugins?: boolean;
  themeTags?: ThemeTag[];
  plugins?: string[];
  filter?: string[];
  /** ToolingLog instance for consistent logging with Kibana's dev mode */
  log?: ToolingLog;
  /** Enable profiling - writes stats.json and enables RsDoctor */
  profile?: boolean;
  /** Skip RsDoctor, only generate stats.json (faster) */
  profileStatsOnly?: boolean;
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
    themeTags = ['borealislight', 'borealisdark'] as ThemeTag[],
    plugins: targetPlugins,
    log,
    filter,
    profile = false,
    profileStatsOnly = false,
    hmr = false,
    hmrPort,
    limitsPath = DEFAULT_LIMITS_PATH,
  } = options;

  // Discover all plugins
  const allPlugins = await discoverPlugins({
    repoRoot,
    examples,
    testPlugins,
    focus: targetPlugins,
    filter,
  });

  // Plugins are already filtered by discoverPlugins
  const plugins = allPlugins;

  // Create a SINGLE unified entry that imports ALL plugins
  // This ensures RSPack can properly deduplicate modules across all plugins
  const wrapperDir = Path.resolve(outputRoot, 'target/.rspack-entry-wrappers');
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  // Collect all plugin entries (core + plugins)
  const pluginEntries = collectPluginEntries(repoRoot, plugins);

  // Create unified entry that imports and registers all plugins
  // Uses relative paths for cache portability across machines
  const unifiedEntryPath = createUnifiedEntry(wrapperDir, repoRoot, pluginEntries);

  if (log) {
    log.info(
      `Unified compilation: ${pluginEntries.length} bundles (core + ${plugins.length} plugins)`
    );
    if (hmr) {
      log.info(`HMR enabled (port ${hmrPort})`);
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

  // Output directory for all bundles (used in output.path and profiling plugins)
  const bundlesDir = Path.resolve(outputRoot, 'target/public/bundles');

  return {
    name: 'kibana',
    mode: dist ? 'production' : 'development',
    // Match legacy webpack optimizer: no sourcemaps in dist, cheap-source-map in dev
    devtool: dist ? false : 'cheap-source-map',
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
      // Async chunks: short hash names in production, descriptive names in development
      chunkFilename: dist ? 'chunks/[contenthash:8].js' : 'chunks/[name].[contenthash:8].js',
      // Use 'auto' to dynamically resolve publicPath at runtime based on document.currentScript
      publicPath: 'auto',
      clean: !watch,
      uniqueName: 'kibana-bundle',
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
      // Using 'all' would require bootstrap renderer changes to inject
      // prerequisite <script> tags -- a future optimization.
      //
      // `minChunks: 2` ensures only modules shared by 2+ async chunks are
      // extracted (no single-consumer shared chunks). `enforce` is NOT used
      // so that minChunks is respected -- A/B testing confirmed this has
      // negligible impact on build speed while preventing unnecessary chunk
      // fragmentation. Named groups use `minSize: 0` to extract ALL shared
      // modules regardless of size, preventing small-module duplication
      // across consuming plugins. The global `minSize: 20000` still applies
      // to `vendors`, `vendorsHeavy`, and `default` catch-all groups.
      //
      // `test` regexes run in Rust; only `name` functions cross the Rust-JS
      // boundary (~0.3s overhead for ~few-thousand matching modules out of
      // 50K+ total, confirmed by A/B benchmarks).
      //
      // `nameForCondition()` is used instead of `module.resource` because
      // the `name` callback receives the base Module type, where `resource`
      // is only available on NormalModule.
      //
      // CACHE GROUP PRIORITY ORDER (highest wins):
      //   35: sharedPlugins    - /plugins/  (all cross-plugin shared code)
      //   32: corePackages     - /src/core/packages/
      //   30: sharedPackages   - /packages/(shared|private)/  (platform packages)
      //   30: vendorsHeavy     - specific heavy node_modules (per-library)
      //   29: solutionPackages - /solutions/*/packages/
      //   28: rootPackages     - /packages/kbn-/  (repo root + x-pack/packages)
      //   20: vendors          - /node_modules/ (minChunks: 3)
      //  -20: default          - catch-all (minChunks: 3, name: 'shared-misc')
      //
      // All groups use category-level static names.  No maxSize — benchmarked
      // at 500K/1M/6M/10M/20M (global and per-group); all caused regressions.
      splitChunks: {
        chunks: 'async',
        minSize: 20000,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          // Disable rspack's built-in defaultVendors group (test: /node_modules/i,
          // priority: -10). Without this, node_modules shared by fewer than 3
          // chunks bypass our custom `vendors` group (minChunks: 3) and create
          // unnecessary small vendor chunks via the hidden default.
          defaultVendors: false,

          // --- Plugin cache group ---
          // All cross-plugin shared modules merged into a single 'shared-plugins'
          // chunk.  Covers all plugin directories:
          //   - src/platform/plugins/(shared|private)/<name>/
          //   - x-pack/platform/plugins/(shared|private)/<name>/
          //   - x-pack/solutions/<solution>/plugins/<name>/
          sharedPlugins: {
            test: /[\\/]plugins[\\/]/,
            name: 'shared-plugins',
            chunks: 'async' as const,
            priority: 35,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },

          // --- Core packages cache group ---
          // src/core/packages/ (~122 browser-relevant packages).
          // All core modules merge into a single 'shared-core' chunk to minimise
          // HTTP requests under HTTP/1.1.  Kibana deploys as a whole, so
          // per-subdomain cache isolation adds no value.
          corePackages: {
            test: /[\\/]src[\\/]core[\\/]packages[\\/]/,
            name: 'shared-core',
            chunks: 'async' as const,
            priority: 32,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },

          // --- Platform packages cache group ---
          // packages/(shared|private)/ — the most impactful shared packages
          // (kbn-palettes, shared-ux, kbn-field-types, etc.).
          // Merged into a single 'shared-packages' chunk.
          sharedPackages: {
            test: /[\\/]packages[\\/](?:shared|private)[\\/]/,
            name: 'shared-packages',
            chunks: 'async' as const,
            priority: 30,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },

          // --- Solution packages cache group ---
          // x-pack/solutions/<solution>/packages/ (~47 browser-relevant).
          // Merged into a single 'shared-solution-packages' chunk.
          solutionPackages: {
            test: /[\\/]solutions[\\/][^\\/]+[\\/]packages[\\/]/,
            name: 'shared-solution-packages',
            chunks: 'async' as const,
            priority: 29,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },

          // --- Root packages cache group ---
          // packages/kbn-*/ at repo root + x-pack/packages/kbn-*/.
          // Currently all ~60 are tooling/server-only so this produces no
          // chunks, but kept as a safety net for future browser-side packages.
          rootPackages: {
            test: /[\\/]packages[\\/]kbn-/,
            name: 'shared-root-packages',
            chunks: 'async' as const,
            priority: 28,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },

          // Heavy vendors NOT in ui-shared-deps — split per package for lazy
          // loading.  Each matched package gets its own chunk so pages only
          // download the specific heavy vendor they need (e.g., maplibre 2MB+).
          vendorsHeavy: {
            test: /[\\/]node_modules[\\/](maplibre-gl|@xyflow|ace-builds|vega|pdf-lib|d3-|dagre|graphlib|ajv|handlebars)/,
            name: (module: Module) => {
              const resource = module.nameForCondition?.();
              if (!resource) return 'vendors-heavy';
              const match = resource.match(/node_modules[\\/](@[^\\/]+[\\/][^\\/]+|[^\\/]+)/);
              return match ? `vendors-heavy-${match[1].replace(/[\\/]/g, '-')}` : 'vendors-heavy';
            },
            priority: 30,
            chunks: 'async' as const,
            minChunks: 3,
            minSize: 0,
            reuseExistingChunk: true,
          },
          // Shared vendors — all node_modules shared by 3+ chunks,
          // consolidated into a single 'vendors' chunk with maxSize safety.
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            minChunks: 3,
            reuseExistingChunk: true,
          },
          // Catch-all for shared async code not matched by named groups above.
          // Static name merges all remaining modules into a single chunk.
          default: {
            minChunks: 3,
            priority: -20,
            reuseExistingChunk: true,
            name: 'shared-misc',
          },
        },
      },
      // Runtime is embedded in the main entry bundle (kibana.bundle.js)
      // Async chunks do NOT contain runtime - they use JSONP to register modules
      runtimeChunk: false,
      // Production optimizations
      minimize: dist,
      minimizer: dist
        ? [
            new rspack.SwcJsMinimizerRspackPlugin({
              // Match legacy webpack optimizer (TerserPlugin) config
              extractComments: false, // Don't extract license comments to separate files
              minimizerOptions: {
                // Target ES2020 - safe based on .browserslistrc (Firefox ESR 115+ supports it)
                ecma: 2020,
                compress: {
                  passes: 2, // Multiple compression passes (same as legacy)
                  ecma: 2020,
                },
                mangle: {
                  keep_classnames: true, // Same as legacy - required for Kibana
                },
                format: {
                  ecma: 2020,
                },
              },
            }),
            // Note: CSS is injected via style-loader, not extracted to files
            // So we don't need LightningCssMinimizerRspackPlugin
          ]
        : [],
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
            version: `v8-${dist ? 'prod' : 'dev'}-${getConfigHash(repoRoot)}`,
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
        manifest: DLL_MANIFEST,
      }),

      // Define environment variables
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
        // Match legacy webpack - used for conditional code in plugins
        'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify(dist ? 'true' : 'false'),
        // HMR SSE server port - injected at build time for the HMR client
        ...(hmr && hmrPort ? { __KBN_HMR_PORT__: JSON.stringify(hmrPort) } : {}),
      }),

      // Elastic License 2.0 banner for x-pack plugin chunks
      new XPackBannerPlugin(repoRoot, plugins),

      // Emit chunk-manifest.json listing named shared chunks for <link rel="preload">
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
            return [new BundleMetricsPlugin(metricsInfos, limitsPath)];
          })()
        : []),

      // HMR plugins -- enabled in watch dev mode
      ...(hmr
        ? [
            new rspack.HotModuleReplacementPlugin(),
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
            // Emit stats.json for detailed bundle analysis
            // Use external tools to analyze: https://statoscope.tech/ or webpack-bundle-analyzer
            new EmitStatsPlugin(bundlesDir, log),
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
// Entry file version - increment when changing the entry generation logic
// This ensures the entry file is regenerated when config structure changes
const ENTRY_VERSION = 'v9';

function createUnifiedEntry(
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
  const allImports = pluginEntries
    .map((entry) => {
      const chunkName = `plugin-${entry.pluginId}`;
      // Sanitize the entry id for use as a filename (replace / with __)
      const wrapperFilename = `${entry.id.replace(/\//g, '__')}.js`;
      const wrapperPath = Path.join(pluginWrapperDir, wrapperFilename);
      const relativeSourcePath = toRelativePath(entry.path, pluginWrapperDir);

      Fs.writeFileSync(wrapperPath, `export * from ${JSON.stringify(relativeSourcePath)};\n`);

      const relativeWrapperPath = toRelativePath(wrapperPath);
      return `    import(/* webpackChunkName: ${JSON.stringify(chunkName)} */ ${JSON.stringify(
        relativeWrapperPath
      )}).then(m => registerPlugin('${entry.bundleId}', m))`;
    })
    .join(',\n');

  const content = `// Auto-generated unified entry for Kibana RSPack build
// Plugin list hash: ${pluginListHash}
// Generated at: ${new Date().toISOString()}
//
// ALL-ASYNC STRATEGY:
// 1. Core + all plugins loaded in parallel via dynamic import()
// 2. Each target gets a webpackChunkName; same-plugin targets merge into one chunk
// 3. RSPack naturally splits shared code via splitChunks cache groups
// 4. kibana.bundle.js is just the runtime + orchestration shell

// Verify __kbnBundles__ is available
if (typeof __kbnBundles__ === 'undefined' || typeof __kbnBundles__.define !== 'function') {
  throw new Error('__kbnBundles__ is not defined');
}

// Helper to register a plugin
function registerPlugin(bundleId, moduleExports) {
  __kbnBundles__.define(bundleId, () => moduleExports, bundleId);
}

// ============================================
// All bundles (core + plugins) loaded in parallel via async imports
// ============================================
// Core is loaded as "plugin-core" alongside all other plugins.
// Promise.all ensures ALL .then() callbacks complete before resolving,
// so core is guaranteed to be registered before __kbnBootstrap__() runs.
window.__kbnPluginsLoaded = Promise.all([
${allImports}
]).then(() => {
  console.log('[@kbn/rspack-optimizer] All plugins loaded');
}).catch(err => {
  console.error('[@kbn/rspack-optimizer] Failed to load plugins:', err);
  throw err;
});
`;

  Fs.writeFileSync(unifiedEntryPath, content);
  return unifiedEntryPath;
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
function collectPluginEntries(
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
 * RSPack plugin that watches for plugin changes (kibana.jsonc files)
 * and triggers a rebuild when plugins are added or removed.
 */
class PluginWatchPlugin {
  private pluginManifests: string[];
  private options: SingleCompileConfigOptions;
  private wrapperDir: string;
  private lastPluginHash: string = '';
  private hasInitialDiscovery = false;

  constructor(pluginManifests: string[], options: SingleCompileConfigOptions, wrapperDir: string) {
    this.pluginManifests = pluginManifests;
    this.options = options;
    this.wrapperDir = wrapperDir;
  }

  private shouldRediscoverPlugins(compiler: Compiler): boolean {
    if (!this.hasInitialDiscovery) return true;

    const modified = compiler.modifiedFiles;
    const removed = compiler.removedFiles;

    if (!modified && !removed) return true;

    const hasFileWithExtension = (files: ReadonlySet<string> | undefined): boolean => {
      if (!files) return false;
      for (const f of files) {
        if (Path.extname(f) !== '') return true;
      }
      return false;
    };

    // Only directories changed (no files with extensions) -- structural change, trigger discovery
    if (!hasFileWithExtension(modified) && !hasFileWithExtension(removed)) {
      return true;
    }

    const isManifest = (f: string) => f.endsWith('/kibana.jsonc') || f.endsWith('\\kibana.jsonc');
    const isPluginEntry = (f: string) => /[/\\]public[/\\]index\.(?!test\.)[^/\\]+$/.test(f);
    const isPackageMap = (f: string) =>
      f.endsWith('/package-map.json') || f.endsWith('\\package-map.json');

    const isRelevant = (f: string) => isManifest(f) || isPluginEntry(f) || isPackageMap(f);

    if (modified) {
      for (const f of modified) {
        if (isRelevant(f)) return true;
      }
    }
    if (removed) {
      for (const f of removed) {
        if (isRelevant(f)) return true;
      }
    }

    return false;
  }

  apply(compiler: Compiler) {
    compiler.hooks.afterCompile.tap('PluginWatchPlugin', (compilation) => {
      // Watch existing plugin directories for manifest changes
      for (const manifest of this.pluginManifests) {
        compilation.contextDependencies.add(Path.dirname(manifest));
      }

      // Watch package-map.json to detect new/removed plugins
      // (updated by `yarn kbn bootstrap` when plugins are added/removed)
      compilation.fileDependencies.add(getPackageMapPath());
    });

    compiler.hooks.watchRun.tapAsync('PluginWatchPlugin', async (_compiler, callback) => {
      if (!this.shouldRediscoverPlugins(_compiler)) {
        callback();
        return;
      }

      this.hasInitialDiscovery = true;

      try {
        const currentPlugins = await discoverPlugins({
          repoRoot: this.options.repoRoot,
          examples: this.options.examples || false,
          testPlugins: this.options.testPlugins || false,
          focus: this.options.plugins,
          filter: this.options.filter,
        });

        // Collect plugin entries
        const pluginEntries = collectPluginEntries(this.options.repoRoot, currentPlugins);

        const currentHash = rspack.util
          .createHash('xxhash64')
          .update(pluginEntries.map((e) => `${e.id}:${e.path}`).join('\n'), 'utf-8')
          .digest('hex');

        // If plugin list changed, regenerate the unified entry
        if (currentHash !== this.lastPluginHash) {
          const isInitial = this.lastPluginHash === '';
          this.lastPluginHash = currentHash;

          // Regenerate unified entry (will update zone chunks too)
          createUnifiedEntry(this.wrapperDir, this.options.repoRoot, pluginEntries);

          // Update manifest list for watching
          this.pluginManifests = currentPlugins.map((p) => Path.join(p.contextDir, 'kibana.jsonc'));

          if (this.options.log) {
            this.options.log.info(
              `Plugin list changed, regenerating entry (${pluginEntries.length} bundles)`
            );
            if (!isInitial) {
              this.options.log.warning(
                'Browser plugin list changed. Stop and restart the dev server for the changes to take full effect.'
              );
            }
          }
        }

        callback();
      } catch (err) {
        callback(err as Error);
      }
    });
  }
}
