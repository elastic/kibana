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
import { rspack, type Configuration, type RuleSetRule } from '@rspack/core';
import { discoverPlugins, createCoreEntry } from '../utils/plugin_discovery';
import { KbnBundleRefsPlugin } from '../plugins/kbn_bundle_refs_plugin';
import { KbnEntryWrapperPlugin } from '../plugins/kbn_entry_wrapper_plugin';
import { OutputRouterPlugin } from '../plugins/output_router_plugin';
import { BundleMetricsPlugin } from '../plugins/bundle_metrics_plugin';
import type { PluginEntry, ThemeTag } from '../types';
import { getExternals } from './externals';
import { createThemeRules } from './theme_rules';

export interface RspackConfigOptions {
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
  /** Path to asset size limits file */
  limitsPath?: string;
  /** Plugin IDs to focus on */
  focus?: string[];
  /** Plugin IDs to exclude */
  filter?: string[];
  /** Enable profiling/stats output */
  profile?: boolean;
}

/**
 * Create RSPack configuration for building all Kibana plugins
 */
export async function createRspackConfig(options: RspackConfigOptions): Promise<Configuration> {
  const {
    repoRoot,
    outputRoot = repoRoot,
    dist = false,
    watch = false,
    cache = true,
    examples = false,
    testPlugins = false,
    themeTags = ['borealislight', 'borealisdark'],
    limitsPath,
    focus,
    filter,
    profile = false,
  } = options;

  // Load limits if path provided
  const limits = limitsPath ? loadLimits(limitsPath) : {};

  // Discover all plugins
  const plugins = discoverPlugins({
    repoRoot,
    outputRoot,
    examples,
    testPlugins,
    limits,
    focus,
    filter,
  });

  // Add core entry
  const coreEntry = createCoreEntry(repoRoot, outputRoot);
  const allEntries = [coreEntry, ...plugins];

  // Generate entry points
  const entry = generateEntries(allEntries);

  // Build externals map for shared deps
  const externals = getExternals();

  return {
    name: 'kibana-rspack-optimizer',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: repoRoot,

    entry,

    output: {
      path: Path.resolve(outputRoot, '.rspack-output'),
      filename: '[name].js',
      chunkFilename: 'chunks/[name].[contenthash:8].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: 'auto',
      clean: !watch,
      hashFunction: 'xxhash64',
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      alias: {
        // EUI optimization
        '@elastic/eui$': '@elastic/eui/optimize/es',
      },
      tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
    },

    externals,

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
        // CSS from node_modules
        {
          test: /\.css$/,
          include: /node_modules/,
          type: 'css',
        },
        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8 * 1024, // 8KB
            },
          },
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
        },
        // Raw files
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
      splitChunks: {
        chunks: 'async',
        minSize: 20000,
        minChunks: 1,
        maxAsyncRequests: 30,
        maxInitialRequests: 30,
        cacheGroups: {
          // Per-plugin chunking only - no shared chunks across plugins
          // This matches current behavior where each plugin is independent
          default: {
            minChunks: 2,
            priority: -20,
            reuseExistingChunk: true,
          },
        },
      },
    },

    plugins: [
      // Handle cross-plugin imports via __kbnBundles__
      new KbnBundleRefsPlugin(allEntries),

      // Wrap entry outputs with __kbnBundles__.define()
      new KbnEntryWrapperPlugin(allEntries),

      // Route outputs to per-plugin directories
      new OutputRouterPlugin(allEntries, outputRoot),

      // Collect bundle metrics
      new BundleMetricsPlugin({
        plugins: allEntries,
        limitsPath,
      }),

      // Progress reporting
      new rspack.ProgressPlugin({
        prefix: '@kbn/rspack-optimizer',
      }),

      // Profile output
      ...(profile
        ? [
            // Stats output for analysis
          ]
        : []),
    ],

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(repoRoot, 'node_modules/.cache/rspack'),
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

    stats: {
      preset: 'errors-warnings',
      timings: true,
      builtAt: true,
    },

    infrastructureLogging: {
      level: 'warn',
    },
  };
}

/**
 * Generate entry points for all plugins
 */
function generateEntries(plugins: PluginEntry[]): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const plugin of plugins) {
    const entryPath = Path.resolve(plugin.contextDir, 'public/index.ts');

    // Check for index.tsx as fallback
    const entryPathTsx = Path.resolve(plugin.contextDir, 'public/index.tsx');
    const actualPath = Fs.existsSync(entryPath) ? entryPath : entryPathTsx;

    if (!Fs.existsSync(actualPath)) {
      console.warn(`Warning: No entry found for plugin ${plugin.id} at ${entryPath}`);
      continue;
    }

    const entryName =
      plugin.type === 'entry' ? `${plugin.id}.entry` : `${plugin.id}.plugin`;

    entries[entryName] = actualPath;
  }

  return entries;
}

/**
 * Load asset size limits from YAML file
 */
function loadLimits(limitsPath: string): Record<string, number> {
  if (!Fs.existsSync(limitsPath)) {
    return {};
  }

  try {
    const content = Fs.readFileSync(limitsPath, 'utf8');
    // Simple YAML parsing for pageLoadAssetSize section
    const lines = content.split('\n');
    const limits: Record<string, number> = {};
    let inPageLoadSection = false;

    for (const line of lines) {
      if (line.trim() === 'pageLoadAssetSize:') {
        inPageLoadSection = true;
        continue;
      }

      if (inPageLoadSection) {
        if (!line.startsWith('  ') && line.trim() !== '') {
          break; // End of section
        }

        const match = line.match(/^\s+(\w+):\s*(\d+)/);
        if (match) {
          limits[match[1]] = parseInt(match[2], 10);
        }
      }
    }

    return limits;
  } catch {
    return {};
  }
}
