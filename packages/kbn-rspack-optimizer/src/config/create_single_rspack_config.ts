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
import { discoverPlugins, createCoreEntry } from '../utils/plugin_discovery';
import { createThemeRules } from './theme_rules';
import type { PluginEntry, ThemeTag } from '../types';

export interface SingleRspackConfigOptions {
  /** Repository root path */
  repoRoot: string;
  /** Output root path (defaults to repoRoot) */
  outputRoot?: string;
  /** Production/distribution build */
  dist?: boolean;
  /** Enable watch mode */
  watch?: boolean;
  /** Enable caching */
  cache?: boolean;
  /** Include example plugins */
  examples?: boolean;
  /** Include test plugins */
  testPlugins?: boolean;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
  /** Plugin IDs to focus on */
  focus?: string[];
  /** Plugin IDs to exclude */
  filter?: string[];
}

/**
 * Create a SINGLE RSPack configuration that builds ALL plugins together
 * 
 * This is the most efficient approach:
 * - ONE compilation parses all shared dependencies ONCE
 * - RSPack automatically deduplicates modules
 * - Code splitting creates separate chunks per plugin
 * - Much faster than running 200+ separate compilations
 */
export async function createSingleRspackConfig(
  options: SingleRspackConfigOptions
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
    focus,
    filter,
  } = options;

  // Discover all plugins
  const allPlugins = discoverPlugins({
    repoRoot,
    outputRoot,
    examples,
    testPlugins,
    focus,
    filter,
  });

  // Filter to plugins with valid entry points
  const plugins = allPlugins.filter((plugin) => {
    const entryPath = findEntry(plugin.contextDir);
    return entryPath !== null;
  });

  // Create core entry
  const coreEntry = createCoreEntry(repoRoot, outputRoot);
  const coreEntryPath = findEntry(coreEntry.contextDir);

  if (!coreEntryPath) {
    throw new Error('Core entry point not found');
  }

  // eslint-disable-next-line no-console
  console.log(`[rspack] Single compilation: core + ${plugins.length} plugins`);

  // Build entry points map - one entry per plugin
  const entry: Record<string, string> = {
    'core': coreEntryPath,
  };

  for (const plugin of plugins) {
    const entryPath = findEntry(plugin.contextDir);
    if (entryPath) {
      entry[`plugin/${plugin.id}`] = entryPath;
    }
  }

  // Output directory - single location, organized by plugin
  const outputPath = Path.resolve(outputRoot, 'target/public/bundles');

  return {
    name: 'kibana',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: repoRoot,

    // All plugins as separate entry points
    entry,

    output: {
      path: outputPath,
      // Each entry gets its own file in a subdirectory
      filename: (pathData) => {
        const name = pathData.chunk?.name || 'unknown';
        if (name === 'core') {
          return 'core/core.entry.js';
        }
        // plugin/dashboard -> dashboard/dashboard.plugin.js
        const pluginId = name.replace('plugin/', '');
        return `${pluginId}/${pluginId}.plugin.js`;
      },
      chunkFilename: 'chunks/[name].[contenthash:8].js',
      // Dynamic public path based on plugin
      publicPath: 'auto',
      clean: true,
      // Library output for __kbnBundles__ compatibility
      library: {
        type: 'assign-properties',
        name: ['__kbnBundles__', '[name]'],
      },
    },

    // Enable CSS support
    experiments: {
      css: true,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
      },
      tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
    },

    module: {
      rules: [
        // TypeScript/JavaScript with SWC
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
                decorators: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
              target: 'es2020',
            },
          },
        },
        // SCSS with theme support
        ...createThemeRules(themeTags, repoRoot, dist),
        // CSS
        {
          test: /\.css$/,
          type: 'css',
        },
        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024,
            },
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
      ],
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
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

      // Critical: Split shared dependencies into common chunks
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          // Vendor chunk for node_modules
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Kibana packages shared across plugins
          kbnPackages: {
            test: /[\\/](packages|src\/platform\/packages)[\\/]/,
            name: 'kbn-packages',
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
            minChunks: 2, // Only extract if used by 2+ plugins
          },
          // Common code used by multiple plugins
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 3, // Used by 3+ plugins
            priority: 1,
            reuseExistingChunk: true,
          },
        },
      },
    },

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(repoRoot, 'node_modules/.cache/rspack-single'),
          buildDependencies: {
            config: [__filename],
          },
        }
      : false,

    watchOptions: watch
      ? {
          ignored: /node_modules/,
          aggregateTimeout: 300,
        }
      : undefined,

    plugins: [
      // Progress
      new rspack.ProgressPlugin({
        prefix: 'kibana',
      }),

      // Define plugin for environment
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
      chunks: false,
      modules: false,
    },
  };
}

function findEntry(contextDir: string): string | null {
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  for (const ext of extensions) {
    const entryPath = Path.resolve(contextDir, `public/index${ext}`);
    if (Fs.existsSync(entryPath)) {
      return entryPath;
    }
  }

  return null;
}
