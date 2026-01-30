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
import { createHostMFConfig, createPluginMFConfig } from './module_federation';
import { BundleMetricsPlugin } from '../plugins/bundle_metrics_plugin';
import { UnifiedProgressPlugin } from '../plugins/unified_progress_plugin';
import { createThemeRules } from './theme_rules';
import type { PluginEntry, ThemeTag } from '../types';

export interface MFRspackConfigOptions {
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
 * Create RSPack configurations using Module Federation
 * 
 * This creates MULTIPLE configurations - one for the host (core) and one for each plugin.
 * RSPack can build them all in a single compilation using the array config format.
 * 
 * Benefits:
 * - No DLL or shared deps bundle needed
 * - Dependencies are shared at runtime via MF
 * - Each plugin is truly independent
 * - Plugins can be loaded dynamically
 */
export async function createMFRspackConfig(
  options: MFRspackConfigOptions
): Promise<Configuration[]> {
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

  // Load limits
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

  // Create core entry
  const coreEntry = createCoreEntry(repoRoot, outputRoot);

  // Build base configuration shared by all
  const baseConfig = createBaseConfig(repoRoot, dist, cache, watch, themeTags);

  // Filter plugins that have valid entry points
  const skippedPlugins: string[] = [];
  const validPlugins = plugins.filter((plugin) => {
    const entryPath = findEntry(plugin.contextDir);
    if (!entryPath) {
      // Skip plugins without a valid entry point
      skippedPlugins.push(plugin.id);
      return false;
    }
    return true;
  });

  // eslint-disable-next-line no-console
  console.log(`[rspack] Found ${plugins.length} plugins total, ${validPlugins.length} with valid entry points`);

  if (skippedPlugins.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[rspack] Skipping ${skippedPlugins.length} plugins without public/index entry: ${skippedPlugins.slice(0, 5).join(', ')}${skippedPlugins.length > 5 ? '...' : ''}`
    );
  }

  if (validPlugins.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[rspack] Building plugins: ${validPlugins.slice(0, 10).map((p) => p.id).join(', ')}${validPlugins.length > 10 ? `... and ${validPlugins.length - 10} more` : ''}`);
  }

  // Total number of compilers (core + plugins)
  const totalCompilers = 1 + validPlugins.length;

  // Create host configuration (core) - first compiler gets totalCompilers
  const hostConfig = createHostConfig(
    coreEntry,
    validPlugins,
    baseConfig,
    outputRoot,
    dist,
    limitsPath,
    totalCompilers
  );

  // Create plugin configurations
  const pluginConfigs = validPlugins.map((plugin) =>
    createPluginConfig(plugin, baseConfig, outputRoot, dist, limitsPath)
  );

  return [hostConfig, ...pluginConfigs];
}

function createBaseConfig(
  repoRoot: string,
  dist: boolean,
  cache: boolean,
  watch: boolean,
  themeTags: ThemeTag[]
): Partial<Configuration> {
  return {
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',

    // Enable CSS support in RSPack
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
        // CSS from node_modules - use css type with experiments.css
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
    },

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(repoRoot, 'node_modules/.cache/rspack-mf'),
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
    },
  };
}

function createHostConfig(
  core: PluginEntry,
  plugins: PluginEntry[],
  baseConfig: Partial<Configuration>,
  outputRoot: string,
  dist: boolean,
  limitsPath?: string,
  totalCompilers?: number
): Configuration {
  const entryPath = findEntry(core.contextDir);

  if (!entryPath) {
    throw new Error(`No entry point found for core at ${core.contextDir}/public/`);
  }

  return {
    ...baseConfig,
    name: 'kibana-host',
    context: core.contextDir,

    entry: {
      'core.entry': entryPath,
    },

    output: {
      path: core.outputDir,
      filename: '[name].js',
      chunkFilename: 'core.chunk.[id].[contenthash:8].js',
      publicPath: 'auto',
      clean: true,
    },

    plugins: [
      // Module Federation - host configuration
      new rspack.container.ModuleFederationPlugin(createHostMFConfig(plugins)),

      // Metrics
      new BundleMetricsPlugin({
        plugins: [core],
        limitsPath,
      }),

      // Unified Progress - core is first, so it gets totalCompilers
      new UnifiedProgressPlugin({
        compilerId: 'core',
        totalCompilers,
      }),
    ],
  } as Configuration;
}

function createPluginConfig(
  plugin: PluginEntry,
  baseConfig: Partial<Configuration>,
  outputRoot: string,
  dist: boolean,
  limitsPath?: string
): Configuration {
  const entryPath = findEntry(plugin.contextDir);

  // This should not happen since we filter plugins beforehand, but guard anyway
  if (!entryPath) {
    throw new Error(`No entry point found for plugin ${plugin.id} at ${plugin.contextDir}/public/`);
  }

  return {
    ...baseConfig,
    name: `plugin-${plugin.id}`,
    context: plugin.contextDir,

    entry: {
      [plugin.id]: entryPath,
    },

    output: {
      path: plugin.outputDir,
      filename: `${plugin.id}.plugin.js`,
      chunkFilename: `${plugin.id}.chunk.[id].[contenthash:8].js`,
      publicPath: 'auto',
      clean: true,
    },

    plugins: [
      // Module Federation - remote configuration
      new rspack.container.ModuleFederationPlugin(createPluginMFConfig(plugin)),

      // Metrics
      new BundleMetricsPlugin({
        plugins: [plugin],
        limitsPath,
      }),

      // Unified Progress - contributes to the overall progress bar
      new UnifiedProgressPlugin({
        compilerId: plugin.id,
      }),
    ],
  } as Configuration;
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

function loadLimits(limitsPath: string): Record<string, number> {
  if (!Fs.existsSync(limitsPath)) return {};

  try {
    const content = Fs.readFileSync(limitsPath, 'utf8');
    const lines = content.split('\n');
    const limits: Record<string, number> = {};
    let inPageLoadSection = false;

    for (const line of lines) {
      if (line.trim() === 'pageLoadAssetSize:') {
        inPageLoadSection = true;
        continue;
      }

      if (inPageLoadSection) {
        if (!line.startsWith('  ') && line.trim() !== '') break;
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
