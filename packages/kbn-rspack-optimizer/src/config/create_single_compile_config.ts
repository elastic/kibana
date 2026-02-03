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
  const unifiedEntryPath = createUnifiedEntry(wrapperDir, pluginEntries);

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
      // Single unified bundle
      filename: 'kibana.bundle.js',
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
      // Progressive loading via dynamic imports creates natural chunk boundaries
      // The entry file uses import() for platform and solutions, creating async chunks
      splitChunks: {
        chunks: 'async',
        minSize: 10000, // 10KB minimum
        maxAsyncRequests: 30,
        cacheGroups: {
          // Platform - src/platform/* code
          platform: {
            test: /[\\/]src[\\/]platform[\\/]/,
            name: 'platform',
            priority: 100,
            enforce: true,
            reuseExistingChunk: true,
          },
          // x-pack platform - x-pack/platform/* code (licensing, alerting, etc.)
          xpackPlatform: {
            test: /[\\/]x-pack[\\/]platform[\\/]/,
            name: 'xpack-platform',
            priority: 95,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Security solution
          solutionSecurity: {
            test: /[\\/]x-pack[\\/]solutions[\\/]security[\\/]/,
            name: 'solution-security',
            priority: 90,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Observability solution
          solutionObservability: {
            test: /[\\/]x-pack[\\/]solutions[\\/]observability[\\/]/,
            name: 'solution-observability',
            priority: 90,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Search solution
          solutionSearch: {
            test: /[\\/]x-pack[\\/]solutions[\\/]search[\\/]/,
            name: 'solution-search',
            priority: 90,
            enforce: true,
            reuseExistingChunk: true,
          },
          // Heavy vendors NOT in ui-shared-deps - large npm packages for separate caching
          // NOTE: Monaco is in ui-shared-deps, don't include here
          // NOTE: Prettier is dev-only, should never be in browser bundles
          vendorsHeavy: {
            test: /[\\/]node_modules[\\/](maplibre-gl|@xyflow|ace-builds)/,
            name: 'vendors-heavy',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Shared vendors - npm packages used by 2+ async chunks
          // Consolidates things like zod, date-fns, etc. into one chunk
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: 20,
            minChunks: 2, // Only if shared by 2+ chunks
            reuseExistingChunk: true,
          },
          // Default for other shared async code (non-vendor)
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
      // Each entry contains its own runtime
      runtimeChunk: false,
      minimize: dist,
      minimizer: dist
        ? [
            new rspack.SwcJsMinimizerRspackPlugin({
              minimizerOptions: {
                compress: {
                  drop_console: false,
                  drop_debugger: true,
                },
                mangle: true,
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
            // Build dependencies - cache is invalidated when any of these change
            buildDependencies: [
              // RSPack optimizer config files
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/package.json'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/externals.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/shared_config.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/create_single_compile_config.ts'),
              // Root package.json (dependency versions)
              Path.resolve(repoRoot, 'package.json'),
              // Shared deps built outputs - invalidate when shared deps are rebuilt
              Path.resolve(
                repoRoot,
                'target/build/src/platform/packages/private/kbn-ui-shared-deps-npm/shared_built_assets/kbn-ui-shared-deps-npm.dll.js'
              ),
              Path.resolve(
                repoRoot,
                'target/build/src/platform/packages/private/kbn-ui-shared-deps-src/shared_built_assets/kbn-ui-shared-deps-src.js'
              ),
              // Shared deps source files (in case builds are stale)
              Path.resolve(
                repoRoot,
                'src/platform/packages/private/kbn-ui-shared-deps-src/src/entry.js'
              ),
              Path.resolve(
                repoRoot,
                'src/platform/packages/private/kbn-ui-shared-deps-src/src/definitions.js'
              ),
            ],
            // Version string to invalidate cache when config changes
            version: `v4-${dist ? 'prod' : 'dev'}`,
          }
        : false,
    },

    plugins: [
      // Node.js browser polyfills (same as kbn-optimizer)
      new NodeLibsBrowserPlugin() as any,

      // Define NODE_ENV
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
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
 * Categorize plugins by zone for progressive loading.
 */
function categorizePlugins(
  pluginEntries: Array<{ id: string; path: string; bundleId: string }>
): {
  core: Array<{ id: string; path: string; bundleId: string }>;
  platform: Array<{ id: string; path: string; bundleId: string }>;
  solutions: {
    security: Array<{ id: string; path: string; bundleId: string }>;
    observability: Array<{ id: string; path: string; bundleId: string }>;
    search: Array<{ id: string; path: string; bundleId: string }>;
    other: Array<{ id: string; path: string; bundleId: string }>;
  };
} {
  const result = {
    core: [] as Array<{ id: string; path: string; bundleId: string }>,
    platform: [] as Array<{ id: string; path: string; bundleId: string }>,
    solutions: {
      security: [] as Array<{ id: string; path: string; bundleId: string }>,
      observability: [] as Array<{ id: string; path: string; bundleId: string }>,
      search: [] as Array<{ id: string; path: string; bundleId: string }>,
      other: [] as Array<{ id: string; path: string; bundleId: string }>,
    },
  };

  for (const entry of pluginEntries) {
    const normalizedPath = entry.path.replace(/\\/g, '/');

    if (entry.id === 'core' || normalizedPath.includes('/src/core/')) {
      result.core.push(entry);
    } else if (normalizedPath.includes('/src/platform/')) {
      result.platform.push(entry);
    } else if (normalizedPath.includes('/solutions/security/')) {
      result.solutions.security.push(entry);
    } else if (normalizedPath.includes('/solutions/observability/')) {
      result.solutions.observability.push(entry);
    } else if (normalizedPath.includes('/solutions/search/')) {
      result.solutions.search.push(entry);
    } else {
      // x-pack plugins not in solutions go to "other"
      result.solutions.other.push(entry);
    }
  }

  return result;
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
function createUnifiedEntry(
  wrapperDir: string,
  pluginEntries: Array<{ id: string; path: string; bundleId: string }>
): string {
  const unifiedEntryPath = Path.join(wrapperDir, 'kibana-unified-entry.js');

  // Create a hash of the plugin list to detect changes
  const pluginListHash = crypto
    .createHash('md5')
    .update(pluginEntries.map((e) => `${e.id}:${e.path}`).join('\n'))
    .digest('hex');

  // Check if file exists and has the same hash (skip regeneration)
  if (Fs.existsSync(unifiedEntryPath)) {
    const existingContent = Fs.readFileSync(unifiedEntryPath, 'utf-8');
    const hashMatch = existingContent.match(/\/\/ Plugin list hash: ([a-f0-9]+)/);
    if (hashMatch && hashMatch[1] === pluginListHash) {
      return unifiedEntryPath;
    }
  }

  // Categorize plugins by zone
  const categorized = categorizePlugins(pluginEntries);

  // Create separate chunk files for each zone
  const platformChunkPath = createZoneChunk(wrapperDir, 'platform', categorized.platform);
  const securityChunkPath = createZoneChunk(wrapperDir, 'solution-security', categorized.solutions.security);
  const o11yChunkPath = createZoneChunk(wrapperDir, 'solution-observability', categorized.solutions.observability);
  const searchChunkPath = createZoneChunk(wrapperDir, 'solution-search', categorized.solutions.search);
  const otherChunkPath = createZoneChunk(wrapperDir, 'solution-other', categorized.solutions.other);

  // Generate SYNC imports for core (always needed first)
  const coreImports = categorized.core.map((entry, i) => {
    return `import * as core_${i} from ${JSON.stringify(entry.path)};`;
  }).join('\n');

  const coreRegistrations = categorized.core.map((entry, i) => {
    return `registerPlugin('${entry.bundleId}', core_${i});`;
  }).join('\n');

  const content = `// Auto-generated unified entry for Kibana RSPack build
// Plugin list hash: ${pluginListHash}
// Generated at: ${new Date().toISOString()}
//
// PROGRESSIVE LOADING STRATEGY:
// 1. Core loads synchronously (always needed)
// 2. Platform + Solutions load async via Promise
// 3. Bootstrap waits for __kbnPluginsLoaded before starting

// Verify __kbnBundles__ is available
if (typeof __kbnBundles__ === 'undefined' || typeof __kbnBundles__.define !== 'function') {
  throw new Error('__kbnBundles__ is not defined');
}

// Helper to register a plugin
function registerPlugin(bundleId, moduleExports) {
  __kbnBundles__.define(bundleId, () => moduleExports, bundleId);
}

// Helper to register plugins from a chunk
function registerChunkPlugins(chunkModule) {
  if (chunkModule && chunkModule.plugins) {
    for (const [bundleId, mod] of Object.entries(chunkModule.plugins)) {
      registerPlugin(bundleId, mod);
    }
  }
}

// ============================================
// PHASE 1: Core (synchronous - always needed)
// ============================================
${coreImports}
${coreRegistrations}

// ============================================
// PHASE 2 & 3: Platform + Solutions (async)
// ============================================
// Create a global promise that bootstrap can wait for
window.__kbnPluginsLoaded = (async function loadAllPlugins() {
  try {
    // Load platform first
    const platformChunk = await import(${JSON.stringify(platformChunkPath)});
    registerChunkPlugins(platformChunk);

    // Load all solutions in parallel
    const [securityChunk, o11yChunk, searchChunk, otherChunk] = await Promise.all([
      import(${JSON.stringify(securityChunkPath)}),
      import(${JSON.stringify(o11yChunkPath)}),
      import(${JSON.stringify(searchChunkPath)}),
      import(${JSON.stringify(otherChunkPath)}),
    ]);

    registerChunkPlugins(securityChunk);
    registerChunkPlugins(o11yChunk);
    registerChunkPlugins(searchChunk);
    registerChunkPlugins(otherChunk);

    console.log('[rspack] All plugins loaded');
  } catch (err) {
    console.error('[rspack] Failed to load plugins:', err);
    throw err;
  }
})();

// Export core for compatibility
export { core_0 as core };
`;

  Fs.writeFileSync(unifiedEntryPath, content);
  return unifiedEntryPath;
}

/**
 * Create a zone-specific chunk file that exports all plugins in that zone.
 * Uses hash-based caching to avoid unnecessary file writes.
 */
function createZoneChunk(
  wrapperDir: string,
  zoneName: string,
  plugins: Array<{ id: string; path: string; bundleId: string }>
): string {
  const chunkPath = Path.join(wrapperDir, `${zoneName}-chunk.js`);

  // Create hash of plugin list for this zone
  const zoneHash = crypto
    .createHash('md5')
    .update(plugins.map((e) => `${e.id}:${e.path}`).join('\n'))
    .digest('hex');

  if (plugins.length === 0) {
    const emptyContent = `// Empty ${zoneName} chunk\n// Hash: ${zoneHash}\nexport const plugins = {};\n`;
    // Check if we need to write
    if (Fs.existsSync(chunkPath)) {
      const existing = Fs.readFileSync(chunkPath, 'utf-8');
      if (existing.includes(`// Hash: ${zoneHash}`)) {
        return chunkPath; // No change needed
      }
    }
    Fs.writeFileSync(chunkPath, emptyContent);
    return chunkPath;
  }

  const imports = plugins.map((entry, i) => {
    return `import * as plugin_${i} from ${JSON.stringify(entry.path)};`;
  }).join('\n');

  const exports = plugins.map((entry, i) => {
    return `  '${entry.bundleId}': plugin_${i},`;
  }).join('\n');

  const content = `// Auto-generated ${zoneName} chunk
// Hash: ${zoneHash}
${imports}

export const plugins = {
${exports}
};
`;

  // Check if we need to write
  if (Fs.existsSync(chunkPath)) {
    const existing = Fs.readFileSync(chunkPath, 'utf-8');
    if (existing.includes(`// Hash: ${zoneHash}`)) {
      return chunkPath; // No change needed
    }
  }

  Fs.writeFileSync(chunkPath, content);
  return chunkPath;
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
          createUnifiedEntry(this.wrapperDir, pluginEntries);

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
