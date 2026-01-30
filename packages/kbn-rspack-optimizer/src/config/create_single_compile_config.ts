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
    themeTags = ['borealislight', 'borealisdark'],
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

  // Build entry map - each plugin gets its own entry
  // We create wrapper entries that register exports with __kbnBundles__
  const entry: Record<string, { import: string }> = {};

  // Create temporary wrapper entries directory
  const wrapperDir = Path.resolve(outputRoot, 'target/.rspack-entry-wrappers');
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  // Add core
  const coreEntryPath = findEntry(coreEntry.contextDir);
  if (coreEntryPath) {
    const wrapperPath = createEntryWrapper(wrapperDir, 'core', coreEntryPath, 'entry/core/public');
    entry['core'] = { import: wrapperPath };
  }

  // Add plugins
  for (const plugin of plugins) {
    const entryPath = findEntry(plugin.contextDir);
    if (entryPath) {
      const wrapperPath = createEntryWrapper(
        wrapperDir,
        plugin.id,
        entryPath,
        `plugin/${plugin.id}/public`
      );
      entry[plugin.id] = { import: wrapperPath };
    }
  }

  // eslint-disable-next-line no-console
  console.log(`[rspack] Single compilation: ${Object.keys(entry).length} entries (core + ${plugins.length} plugins)`);

  // Get externals for shared deps
  const sharedDepsExternals = getExternals();

  // Build map of plugin pkgIds to their bundle IDs for cross-plugin externals
  const pluginIdMap = new Map<string, { id: string; type: string }>();
  for (const plugin of plugins) {
    pluginIdMap.set(plugin.pkgId, { id: plugin.id, type: 'plugin' });
  }
  pluginIdMap.set('@kbn/core', { id: 'core', type: 'entry' });

  // eslint-disable-next-line no-console
  console.log('[rspack] Plugin externals configured for', pluginIdMap.size, 'plugins');

  return {
    name: 'kibana-plugins',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: repoRoot,

    entry,

    output: {
      // Output to a central location
      path: Path.resolve(outputRoot, 'target/public/bundles'),
      // Entry points go to [name]/[name].plugin.js
      filename: (pathData) => {
        // Runtime chunk goes to root
        if (pathData.chunk?.name === 'runtime') {
          return 'runtime.js';
        }
        // Entry points go to subdirectories
        return '[name]/[name].plugin.js';
      },
      // Async chunks and shared chunks
      chunkFilename: (pathData) => {
        const name = pathData.chunk?.name || 'chunk';
        // Shared chunks go to root for easy loading
        if (['plugin-shared', 'packages-shared', 'vendors'].includes(name)) {
          return `${name}.js`;
        }
        // Other chunks go to their plugin's directory
        return '[name]/[name].[contenthash:8].chunk.js';
      },
      // Use 'auto' to dynamically resolve publicPath at runtime based on document.currentScript
      // This ensures chunks are loaded from the correct path regardless of where Kibana serves them
      publicPath: 'auto',
      clean: !watch,
    },

    // Externalize shared deps AND cross-plugin imports
    externals: [
      // Static externals for shared deps
      sharedDepsExternals,
      // Dynamic externals for cross-plugin imports
      (data: { request?: string }): string | undefined => {
        const { request } = data;
        if (!request) return undefined;

        // Check if this is a plugin import (e.g., @kbn/xxx-plugin/public)
        if (request.startsWith('@kbn/') && request.includes('-plugin')) {
          const parts = request.split('/');
          const pkgId = parts.slice(0, 2).join('/'); // @kbn/xxx-plugin
          const target = parts[2] || 'public'; // public, common, etc.

          const pluginInfo = pluginIdMap.get(pkgId);
          if (pluginInfo && (target === 'public' || target === 'common')) {
            const bundleId = pluginInfo.type === 'entry'
              ? `entry/${pluginInfo.id}/${target}`
              : `plugin/${pluginInfo.id}/${target}`;
            // Return as a global variable expression that will be evaluated at runtime
            return `__kbnBundles__.get('${bundleId}')`;
          }
        }

        // Not a plugin import, let RSPack handle it normally
        return undefined;
      },
    ],

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.peggy', '.scss', '.css'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
      },
      tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
      // NodeLibsBrowserPlugin will configure most fallbacks
      // We just add node:-prefixed module fallbacks here
      fallback: {
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
        'node:child_process': false,
        'node:net': false,
        'node:tls': false,
        'node:dns': false,
        'node:querystring': false,
        'node:assert': false,
        'node:zlib': false,
        'node:vm': false,
        'node:tty': false,
      },
    },

    module: {
      rules: [
        // TypeScript/JavaScript with Babel (same as kbn-optimizer for Emotion support)
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              envName: dist ? 'production' : 'development',
              presets: [
                [
                  require.resolve('@kbn/babel-preset/webpack_preset'),
                  { useTransformRequireDefault: true },
                ],
              ],
            },
          },
        },
        // PEG grammar files
        {
          test: /\.peggy$/,
          type: 'asset/source',
        },
        // URL imports
        {
          resourceQuery: /asUrl/,
          type: 'asset/resource',
        },
        // Raw imports
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        // CSS
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        // SCSS with sass-loader - use style-loader to inject CSS
        // Default theme is borealislight
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !dist,
              },
            },
            {
              loader: 'sass-loader',
              options: {
                implementation: require('sass-embedded'),
                // Prepend EUI globals to every SCSS file
                additionalData: `@import '${Path.resolve(
                  repoRoot,
                  'src/core/public/styles/core_app/_globals_borealislight.scss'
                ).replace(/\\/g, '/')}';\n`,
                sassOptions: {
                  outputStyle: dist ? 'compressed' : 'expanded',
                  includePaths: [Path.resolve(repoRoot, 'node_modules')],
                  sourceMap: !dist,
                  quietDeps: true,
                  silenceDeprecations: [
                    'color-functions',
                    'import',
                    'global-builtin',
                    'legacy-js-api',
                  ],
                },
              },
            },
          ],
        },
        // Images
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024,
            },
          },
        },
        // Fonts
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        // Text files
        {
          test: /\.(html|md|text|txt)$/,
          type: 'asset/source',
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
            new rspack.LightningCssMinimizerRspackPlugin({}),
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

    ignoreWarnings: [
      /Can't resolve 'fs'/,
      /Can't resolve 'path'/,
      /Can't resolve 'child_process'/,
      /Can't resolve 'crypto'/,
      /Critical dependency/,
      // Third-party package export issues (not our code)
      /ESModulesLinkingWarning.*@elastic\/ems-client/,
      /export.*was not found in/,
    ],
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
 * Create a wrapper entry module that:
 * 1. Imports the real entry module
 * 2. Registers its exports with __kbnBundles__
 */
function createEntryWrapper(
  wrapperDir: string,
  pluginId: string,
  realEntryPath: string,
  bundleId: string
): string {
  const wrapperPath = Path.join(wrapperDir, `${pluginId}-entry.js`);

  // Create a wrapper that exports everything from the real entry
  // and registers with __kbnBundles__
  const wrapperContent = `
// Auto-generated entry wrapper for ${pluginId}
// This registers the bundle exports with __kbnBundles__

import * as entryModule from ${JSON.stringify(realEntryPath)};

// Register with __kbnBundles__ if available
if (typeof __kbnBundles__ !== 'undefined' && typeof __kbnBundles__.define === 'function') {
  __kbnBundles__.define(
    '${bundleId}',
    function(key) { return entryModule; },
    '${bundleId}'
  );
}

// Re-export everything from the entry module
export * from ${JSON.stringify(realEntryPath)};
export default entryModule;
`;

  Fs.writeFileSync(wrapperPath, wrapperContent);
  return wrapperPath;
}
