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
import crypto from 'crypto';
import { rspack, type Configuration, type Compiler, type RspackPluginInstance } from '@rspack/core';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import type { ToolingLog } from '@kbn/tooling-log';
import { discoverPlugins, createCoreEntry, type PluginEntry, PLUGIN_DIRS, EXAMPLE_DIRS } from '../utils/plugin_discovery';
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
} from './shared_config';
import type { ThemeTag } from '../types';

/**
 * Compute a hash of the config files that affect the build.
 * This ensures cache invalidation when config changes, since RSPack's
 * buildDependencies may not work correctly with TypeScript files.
 */
function getConfigHash(repoRoot: string): string {
  const configFiles = [
    'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts',
    'packages/kbn-rspack-optimizer/src/config/shared_config.ts',
    'packages/kbn-rspack-optimizer/src/config/externals.ts',
    'packages/kbn-rspack-optimizer/src/loaders/theme_loader.ts',
    'packages/kbn-rspack-optimizer/src/loaders/require_interop_loader.ts',
  ];

  const hash = crypto.createHash('md5');
  for (const file of configFiles) {
    try {
      const content = Fs.readFileSync(Path.resolve(repoRoot, file), 'utf-8');
      hash.update(content);
    } catch {
      // File might not exist in some scenarios, skip
    }
  }
  return hash.digest('hex').slice(0, 8); // Short hash for readability
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

  // How often to log (in percentage points and seconds)
  const PERCENT_INTERVAL = 10; // Log every 10%
  const TIME_INTERVAL_MS = 10000; // Also log if 10 seconds have passed

  // Fallback logger if no ToolingLog provided
  const logInfo = (message: string) => {
    if (isShuttingDown) return; // Don't log during shutdown
    if (log) {
      log.info(message);
    } else {
      // eslint-disable-next-line no-console
      console.log(`[rspack] ${message}`);
    }
  };

  const logError = (message: string) => {
    if (isShuttingDown) return; // Don't log during shutdown
    if (log) {
      log.error(message);
    } else {
      // eslint-disable-next-line no-console
      console.error(`[rspack] ${message}`);
    }
  };

  return {
    apply(compiler: Compiler) {
      compiler.hooks.compile.tap('LogProgressPlugin', () => {
        if (isShuttingDown) return;
        startTime = Date.now();
        lastLogTime = Date.now();
        lastLoggedPercent = -PERCENT_INTERVAL;
        logInfo('Starting compilation...');
      });

      // Use RSPack's built-in progress tracking
      new rspack.ProgressPlugin((percent: number, msg: string) => {
        if (isShuttingDown) return; // Don't log during shutdown

        const percentInt = Math.floor(percent * 100);
        const now = Date.now();
        const timeSinceLastLog = now - lastLogTime;

        // Calculate next milestone (e.g., if last was 43%, next milestone is 50%)
        const nextMilestone = Math.ceil((lastLoggedPercent + 1) / PERCENT_INTERVAL) * PERCENT_INTERVAL;

        // Log at percentage milestones OR if enough time has passed
        const hitPercentMilestone = percentInt >= nextMilestone;
        const hitTimeInterval = timeSinceLastLog >= TIME_INTERVAL_MS && percentInt > lastLoggedPercent;

        if (hitPercentMilestone || hitTimeInterval) {
          // Track actual percent logged, not floored milestone
          lastLoggedPercent = percentInt;
          lastLogTime = now;

          // Extract just the stage name (first word), ignore file paths
          const stage = msg.split(' ')[0] || 'processing';
          const elapsed = ((now - startTime) / 1000).toFixed(1);

          logInfo(`${percentInt}% ${stage} [${elapsed}s]`);
        }
      }).apply(compiler);

      compiler.hooks.done.tap('LogProgressPlugin', (stats) => {
        if (isShuttingDown) return; // Don't log during shutdown
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        if (stats.hasErrors()) {
          logError(`Compilation failed [${elapsed}s]`);
        } else {
          logInfo(`Compilation complete [${elapsed}s]`);
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
  } = options;

  // Discover all plugins
  const allPlugins = await discoverPlugins({
    repoRoot,
    outputRoot,
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
  const pluginEntries = collectPluginEntries(repoRoot, outputRoot, plugins);

  // Create unified entry that imports and registers all plugins
  // Uses relative paths for cache portability across machines
  const unifiedEntryPath = createUnifiedEntry(wrapperDir, repoRoot, pluginEntries);

  if (log) {
    log.info(`Unified compilation: ${pluginEntries.length} bundles (core + ${plugins.length} plugins)`);
  }

  // Collect plugin manifest paths for watching
  const pluginManifests = plugins.map((p) => Path.join(p.contextDir, 'kibana.jsonc'));

  // Get externals for shared deps
  const sharedDepsExternals = getExternals();

  // Note: In single compilation mode, cross-plugin imports are NOT externalized.
  // This allows RSPack to properly deduplicate modules and ensures services
  // are initialized in the correct order. The `externals` only covers
  // npm packages from @kbn/ui-shared-deps.

  return {
    name: 'kibana-plugins',
    mode: dist ? 'production' : 'development',
    // Match legacy webpack optimizer: no sourcemaps in dist, cheap-source-map in dev
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    context: repoRoot,

    entry: {
      // Single entry point that imports all plugins
      kibana: unifiedEntryPath,
    },

    output: {
      // Output to a central location
      path: Path.resolve(outputRoot, 'target/public/bundles'),
      // Single unified bundle (with [name] for runtimeChunk compatibility)
      filename: '[name].bundle.js',
      // Async chunks: short hash names in production, descriptive names in development
      chunkFilename: dist
        ? 'chunks/[contenthash:8].js'
        : 'chunks/[name].[contenthash:8].js',
      // Use 'auto' to dynamically resolve publicPath at runtime based on document.currentScript
      publicPath: 'auto',
      clean: !watch,
    },

    // Only externalize shared deps (npm packages), NOT cross-plugin imports
    // In single compilation mode, cross-plugin imports are bundled together
    // This ensures proper module deduplication and service initialization order
    externals: sharedDepsExternals,

    // Use shared resolve config (same as external plugins)
    resolve: {
      ...getSharedResolveConfig(repoRoot),
      // Additional fallbacks for node:-prefixed modules
      fallback: {
        ...getSharedResolveFallback(),
        // Node:-prefixed modules (NodeLibsBrowserPlugin handles regular ones)
        'node:fs': false,
        'node:path': false,
        'node:os': false,
        'node:crypto': false,
        'node:stream': false,
        'node:buffer': false,
        'node:util': false,
        'node:url': false,
        'node:http': false,
        'node:https': false,
        'node:events': false,
        'node:process': false,
        'node:querystring': false,
        'node:assert': false,
        'node:zlib': false,
        'node:vm': false,
        'node:tty': false,
      },
    },

    module: {
      // Use shared module rules (same loaders as external plugins)
      // Plus additional rules specific to main build
      // SWC for performance + require_interop_loader for ESM/CJS interop
      rules: [
        ...getSharedModuleRules(repoRoot, dist, themeTags, 'kibana'),
        // URL imports (?asUrl query) - specific to main build
        {
          resourceQuery: /asUrl/,
          type: 'asset/resource',
        },
      ],
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      // Match legacy webpack optimizer's more conservative chunk splitting
      // Legacy uses maxAsyncRequests: 10 per plugin
      // With unified compilation, we use slightly higher but still constrained
      splitChunks: {
        chunks: 'async',
        minSize: 100000, // 100KB minimum - balanced for parse time vs requests
        // No maxSize - don't force splitting
        maxAsyncRequests: 30, // Balance between legacy (10) and HTTP/2 optimization
        maxInitialRequests: 30,
        cacheGroups: {
          // Heavy vendors NOT in ui-shared-deps - keep separate for lazy loading
          vendorsHeavy: {
            test: /[\\/]node_modules[\\/](maplibre-gl|@xyflow|ace-builds|vega|pdf-lib|d3-|dagre|graphlib|ajv|handlebars)/,
            name: 'vendors-heavy',
            priority: 30,
            chunks: 'async',
            reuseExistingChunk: true,
          },
          // Shared vendors - extract if used by 5+ chunks
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            minChunks: 5,
            reuseExistingChunk: true,
          },
          // Default for shared async code
          default: {
            minChunks: 3,
            priority: -20,
            reuseExistingChunk: true,
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
            // Build dependencies - files that should invalidate cache when changed
            buildDependencies: [
              // RSPack optimizer config files
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/externals.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/shared_config.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts'),
              // Loaders
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/loaders/theme_loader.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/loaders/require_interop_loader.ts'),
              // Transpiler config (SWC settings)
              Path.resolve(repoRoot, 'packages/kbn-swc-config/src/browser.ts'),
              Path.resolve(repoRoot, 'packages/kbn-transpiler-config/src/shared_config.ts'),
              // Root package.json (dependency versions)
              Path.resolve(repoRoot, 'package.json'),
              // Shared deps source files that affect externals
              Path.resolve(
                repoRoot,
                'src/platform/packages/private/kbn-ui-shared-deps-src/src/definitions.js'
              ),
              Path.resolve(
                repoRoot,
                'src/platform/packages/private/kbn-ui-shared-deps-npm/webpack.config.js'
              ),
            ],
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

    plugins: [
      // Node.js browser polyfills (same as kbn-optimizer)
      new NodeLibsBrowserPlugin() as any,

      // Define environment variables
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
        // Match legacy webpack - used for conditional code in plugins
        'process.env.IS_KIBANA_DISTRIBUTABLE': JSON.stringify(dist ? 'true' : 'false'),
      }),

      // Progress reporting - use log-based progress instead of dynamic terminal updates
      // This avoids terminal state issues on Ctrl+C
      createLogProgressPlugin(log),

      // Watch plugin manifests and regenerate entry when plugins are added/removed
      ...(watch ? [new PluginWatchPlugin(pluginManifests, options, wrapperDir)] : []),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },

    // Use shared ignore warnings (same as external plugins)
    ignoreWarnings: getSharedIgnoreWarnings(),
  };
}

function findEntry(contextDir: string): string | null {
  const publicDir = Path.join(contextDir, 'public');
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  for (const ext of extensions) {
    const entryPath = Path.join(publicDir, `index${ext}`);
    if (Fs.existsSync(entryPath)) {
      return entryPath;
    }
  }

  return null;
}

/**
 * Create a unified entry module with PROGRESSIVE LOADING:
 *
 * Phase 1 (Sync): Core - always needed, loads first
 * Phase 2 (Async): Platform - base functionality, separate chunk
 * Phase 3 (Async): Solutions - per-solution chunks, loaded in parallel
 *
 * This creates natural chunk boundaries via dynamic imports while
 * ensuring all plugins are registered before the app starts.
 */
// Entry file version - increment when changing the entry generation logic
// This ensures the entry file is regenerated when config structure changes
const ENTRY_VERSION = 'v3';

function createUnifiedEntry(
  wrapperDir: string,
  repoRoot: string,
  pluginEntries: Array<{ id: string; path: string; bundleId: string }>
): string {
  const unifiedEntryPath = Path.join(wrapperDir, 'kibana-unified-entry.js');

  // Convert absolute paths to relative paths for cache portability
  // Entry wrapper is at target/.rspack-entry-wrappers/, so we need ../../ to reach repo root
  const toRelativePath = (absolutePath: string): string => {
    const relativePath = Path.relative(wrapperDir, absolutePath);
    // Ensure forward slashes for consistency across platforms
    return relativePath.replace(/\\/g, '/');
  };

  // Create a hash using RELATIVE paths so it's consistent across machines
  // This allows cache reuse when the same plugins are present regardless of repo location
  const pluginListHash = crypto
    .createHash('md5')
    .update(`${ENTRY_VERSION}\n${pluginEntries.map((e) => `${e.id}:${Path.relative(repoRoot, e.path)}`).join('\n')}`)
    .digest('hex');

  // Check if file exists and has the same hash (skip regeneration)
  if (Fs.existsSync(unifiedEntryPath)) {
    const existingContent = Fs.readFileSync(unifiedEntryPath, 'utf-8');
    const hashMatch = existingContent.match(/\/\/ Plugin list hash: ([a-f0-9]+)/);
    if (hashMatch && hashMatch[1] === pluginListHash) {
      return unifiedEntryPath;
    }
  }

  // Separate core from other plugins
  const coreEntries = pluginEntries.filter(e => e.id === 'core');
  const otherEntries = pluginEntries.filter(e => e.id !== 'core');

  // Generate SYNC imports for core (always needed first)
  // Use relative paths for cache portability across machines
  const coreImports = coreEntries.map((entry, i) => {
    return `import * as core_${i} from ${JSON.stringify(toRelativePath(entry.path))};`;
  }).join('\n');

  const coreRegistrations = coreEntries.map((entry, i) => {
    return `registerPlugin('${entry.bundleId}', core_${i});`;
  }).join('\n');

  // Generate DIRECT async imports for each plugin (no zone chunks)
  // RSPack will naturally split based on import dependencies
  // Use relative paths for cache portability
  const pluginImports = otherEntries.map((entry, i) => {
    return `    import(${JSON.stringify(toRelativePath(entry.path))}).then(m => registerPlugin('${entry.bundleId}', m))`;
  }).join(',\n');

  const content = `// Auto-generated unified entry for Kibana RSPack build
// Plugin list hash: ${pluginListHash}
// Generated at: ${new Date().toISOString()}
//
// DIRECT IMPORT STRATEGY (no zone chunks):
// 1. Core loads synchronously (always needed)
// 2. Each plugin loaded directly via import()
// 3. RSPack naturally splits based on dependencies
// 4. maxSize forces large chunks to be split

// Verify __kbnBundles__ is available
if (typeof __kbnBundles__ === 'undefined' || typeof __kbnBundles__.define !== 'function') {
  throw new Error('__kbnBundles__ is not defined');
}

// Helper to register a plugin
function registerPlugin(bundleId, moduleExports) {
  __kbnBundles__.define(bundleId, () => moduleExports, bundleId);
}

// ============================================
// PHASE 1: Core (synchronous - always needed)
// ============================================
${coreImports}
${coreRegistrations}

// ============================================
// PHASE 2: All plugins (parallel async imports)
// ============================================
// Each plugin is imported directly - RSPack handles chunking
window.__kbnPluginsLoaded = Promise.all([
${pluginImports}
]).then(() => {
  console.log('[rspack] All plugins loaded');
}).catch(err => {
  console.error('[rspack] Failed to load plugins:', err);
  throw err;
});

// Export core for compatibility
export { core_0 as core };
`;

  Fs.writeFileSync(unifiedEntryPath, content);
  return unifiedEntryPath;
}

/**
 * Collect plugin entries from discovered plugins
 */
function collectPluginEntries(
  repoRoot: string,
  outputRoot: string,
  plugins: PluginEntry[]
): Array<{ id: string; path: string; bundleId: string }> {
  const pluginEntries: Array<{ id: string; path: string; bundleId: string }> = [];

  // Add core
  const coreEntry = createCoreEntry(repoRoot, outputRoot);
  const coreEntryPath = findEntry(coreEntry.contextDir);
  if (coreEntryPath) {
    pluginEntries.push({ id: 'core', path: coreEntryPath, bundleId: 'entry/core/public' });
  }

  // Add plugins
  for (const plugin of plugins) {
    const entryPath = findEntry(plugin.contextDir);
    if (entryPath) {
      pluginEntries.push({
        id: plugin.id,
        path: entryPath,
        bundleId: `plugin/${plugin.id}/public`,
      });
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

  constructor(pluginManifests: string[], options: SingleCompileConfigOptions, wrapperDir: string) {
    this.pluginManifests = pluginManifests;
    this.options = options;
    this.wrapperDir = wrapperDir;
  }

  apply(compiler: Compiler) {
    // Add plugin directories as context dependencies so RSPack watches them
    compiler.hooks.afterCompile.tap('PluginWatchPlugin', (compilation) => {
      // Watch existing plugin directories
      for (const manifest of this.pluginManifests) {
        compilation.contextDependencies.add(Path.dirname(manifest));
      }

      // Watch parent plugin directories to detect NEW plugins being added
      const dirsToWatch = [...PLUGIN_DIRS];
      if (this.options.examples) {
        dirsToWatch.push(...EXAMPLE_DIRS);
      }

      for (const dir of dirsToWatch) {
        const fullDir = Path.resolve(this.options.repoRoot, dir);
        if (Fs.existsSync(fullDir)) {
          compilation.contextDependencies.add(fullDir);
          // Also watch immediate subdirectories (for nested structures like x-pack/solutions/security)
          try {
            const entries = Fs.readdirSync(fullDir, { withFileTypes: true });
            for (const entry of entries) {
              if (entry.isDirectory()) {
                compilation.contextDependencies.add(Path.join(fullDir, entry.name));
              }
            }
          } catch {
            // Ignore errors reading directories
          }
        }
      }
    });

    // Watch for changes to kibana.jsonc files
    compiler.hooks.watchRun.tapAsync('PluginWatchPlugin', async (_compiler, callback) => {
      try {
        // Re-discover plugins on each watch run to detect additions/removals
        const currentPlugins = await discoverPlugins({
          repoRoot: this.options.repoRoot,
          outputRoot: this.options.outputRoot || this.options.repoRoot,
          examples: this.options.examples || false,
          testPlugins: this.options.testPlugins || false,
          focus: this.options.plugins,
          filter: this.options.filter,
        });

        // Collect plugin entries
        const pluginEntries = collectPluginEntries(
          this.options.repoRoot,
          this.options.outputRoot || this.options.repoRoot,
          currentPlugins
        );

        // Create hash of current plugin list
        const currentHash = crypto
          .createHash('md5')
          .update(pluginEntries.map((e) => `${e.id}:${e.path}`).join('\n'))
          .digest('hex');

        // If plugin list changed, regenerate the unified entry
        if (currentHash !== this.lastPluginHash) {
          this.lastPluginHash = currentHash;

          // Regenerate unified entry (will update zone chunks too)
          createUnifiedEntry(this.wrapperDir, this.options.repoRoot, pluginEntries);

          // Update manifest list for watching
          this.pluginManifests = currentPlugins.map((p) =>
            Path.join(p.contextDir, 'kibana.jsonc')
          );

          // Log the change
          if (this.options.log) {
            this.options.log.info(`Plugin list changed, regenerating entry (${pluginEntries.length} bundles)`);
          }
        }

        callback();
      } catch (err) {
        callback(err as Error);
      }
    });
  }
}
