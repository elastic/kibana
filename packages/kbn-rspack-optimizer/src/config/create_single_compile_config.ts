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
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import { discoverPlugins, createCoreEntry } from '../utils/plugin_discovery';
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
} from './shared_config';
import type { ThemeTag } from '../types';

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
    themeTags: _themeTags = ['borealislight', 'borealisdark'],
    plugins: targetPlugins,
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

  // Add core entry
  const coreEntry = createCoreEntry(repoRoot, outputRoot);

  // Create a SINGLE unified entry that imports ALL plugins
  // This ensures RSPack can properly deduplicate modules across all plugins
  const wrapperDir = Path.resolve(outputRoot, 'target/.rspack-entry-wrappers');
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  // Collect all plugin entries
  const pluginEntries: Array<{ id: string; path: string; bundleId: string }> = [];

  // Add core
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

  // Create unified entry that imports and registers all plugins
  const unifiedEntryPath = createUnifiedEntry(wrapperDir, pluginEntries);

  // eslint-disable-next-line no-console
  console.log(`[rspack] Unified compilation: ${pluginEntries.length} bundles (core + ${plugins.length} plugins)`);

  // Get externals for shared deps
  const sharedDepsExternals = getExternals();

  // Note: In single compilation mode, cross-plugin imports are NOT externalized.
  // This allows RSPack to properly deduplicate modules and ensures services
  // are initialized in the correct order. The `externals` only covers
  // npm packages from @kbn/ui-shared-deps.

  return {
    name: 'kibana-plugins',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
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
      // Async chunks get content hash for caching
      chunkFilename: 'chunks/[name].[contenthash:8].js',
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
      rules: [
        ...getSharedModuleRules(repoRoot, dist),
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
      // Only split async chunks, NOT initial entry chunks
      // We load plugins via <script> tags so entries must be self-contained
      // Async imports (import()) will still be split into separate chunks
      splitChunks: {
        chunks: 'async', // Only split dynamically imported chunks
        cacheGroups: {
          // Default cache groups for async chunks
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
      // Each entry contains its own runtime - no shared runtime chunk
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

    // Experimental features including persistent disk cache
    experiments: {
      // Persistent cache for faster rebuilds between restarts
      cache: cache
        ? {
            type: 'persistent',
            // Use package.json as build dependencies (more stable than compiled JS)
            buildDependencies: [
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/package.json'),
              Path.resolve(repoRoot, 'package.json'),
            ],
            // Version string to invalidate cache when config changes
            version: `v2-${dist ? 'prod' : 'dev'}`,
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

      // Progress reporting
      new rspack.ProgressPlugin({
        prefix: 'rspack',
      }),
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
 * Create a unified entry module that:
 * 1. Imports ALL plugin entry modules
 * 2. Registers each with __kbnBundles__ using the bundleRequire pattern
 *
 * This ensures RSPack can deduplicate all shared modules across plugins
 * while maintaining the __kbnBundles__ registration pattern.
 */
function createUnifiedEntry(
  wrapperDir: string,
  pluginEntries: Array<{ id: string; path: string; bundleId: string }>
): string {
  const unifiedEntryPath = Path.join(wrapperDir, 'kibana-unified-entry.js');

  // Generate imports for all plugins
  const imports = pluginEntries.map((entry, i) => {
    return `import * as plugin_${i} from ${JSON.stringify(entry.path)};`;
  }).join('\n');

  // Generate registrations for all plugins
  // Use the same pattern as kbn-optimizer: bundleRequire function + module key
  const registrations = pluginEntries.map((entry, i) => {
    return `
// Register ${entry.id}
(function() {
  var moduleExports = plugin_${i};
  __kbnBundles__.define(
    '${entry.bundleId}',
    function bundleRequire(key) {
      // Return the module exports when requested
      return moduleExports;
    },
    '${entry.bundleId}'
  );
})();`;
  }).join('\n');

  const content = `
// Auto-generated unified entry for Kibana RSPack build
// This file imports ALL plugins and registers them with __kbnBundles__

${imports}

// Wait for __kbnBundles__ to be available (should be defined in bootstrap template)
if (typeof __kbnBundles__ === 'undefined' || typeof __kbnBundles__.define !== 'function') {
  throw new Error('__kbnBundles__ is not defined. Make sure the bootstrap template runs before loading bundles.');
}

${registrations}

// Export core for the bootstrap to call __kbnBootstrap__
export { plugin_0 as core };
`;

  Fs.writeFileSync(unifiedEntryPath, content);
  return unifiedEntryPath;
}
