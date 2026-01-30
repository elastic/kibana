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
import { getSharedDependencies } from './module_federation';
import type { PluginEntry, ThemeTag } from '../types';

export interface OptimizedMFConfigOptions {
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
  /** 
   * Specific plugin IDs to build.
   * If provided, ONLY these plugins are built (for incremental/isolated builds).
   * The shared runtime must already exist from a previous full build.
   */
  plugins?: string[];
  /** Plugin IDs to exclude */
  filter?: string[];
}

/**
 * Optimized Module Federation configuration
 * 
 * This approach gives you:
 * 1. Independent plugin bundles (can build ONE plugin in isolation)
 * 2. Fast builds (shared deps are externalized, not re-parsed)
 * 3. External plugin support (third-party plugins work)
 * 
 * How it works:
 * - Shared deps (React, EUI, etc.) are marked as MF shared with `eager: false`
 * - RSPack creates a shared runtime that loads deps ONCE
 * - Each plugin is a separate MF remote
 * - Plugins can be built/rebuilt independently
 */
export async function createOptimizedMFConfigs(
  options: OptimizedMFConfigOptions
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
    plugins: targetPlugins,
    filter,
  } = options;

  // Discover all plugins (or just the targeted ones)
  const allPlugins = discoverPlugins({
    repoRoot,
    outputRoot,
    examples,
    testPlugins,
    focus: targetPlugins,
    filter,
  });

  // Filter to plugins with valid entry points
  const plugins = allPlugins.filter((plugin) => {
    const entryPath = findEntry(plugin.contextDir);
    if (!entryPath) {
      // eslint-disable-next-line no-console
      console.log(`[rspack] Skipping ${plugin.id} - no entry point found`);
      return false;
    }
    return true;
  });

  const isIsolatedBuild = targetPlugins && targetPlugins.length > 0;
  const configs: Configuration[] = [];

  // Get shared deps configuration
  const sharedDeps = getSharedDependencies();

  // For full builds, include the host (core) config
  if (!isIsolatedBuild) {
    const coreEntry = createCoreEntry(repoRoot, outputRoot);
    const coreEntryPath = findEntry(coreEntry.contextDir);

    if (coreEntryPath) {
      configs.push(
        createHostConfig({
          repoRoot,
          outputRoot,
          coreEntry,
          coreEntryPath,
          sharedDeps,
          themeTags,
          dist,
          watch,
          cache,
        })
      );
    }
  }

  // Create config for each plugin (MF remote)
  for (const plugin of plugins) {
    const entryPath = findEntry(plugin.contextDir)!;
    
    configs.push(
      createPluginRemoteConfig({
        repoRoot,
        outputRoot,
        plugin,
        entryPath,
        sharedDeps,
        themeTags,
        dist,
        watch,
        cache,
      })
    );
  }

  // eslint-disable-next-line no-console
  console.log(`[rspack] Created ${configs.length} MF configurations`);
  if (isIsolatedBuild) {
    // eslint-disable-next-line no-console
    console.log(`[rspack] Isolated build for: ${targetPlugins!.join(', ')}`);
  }

  return configs;
}

interface HostConfigOptions {
  repoRoot: string;
  outputRoot: string;
  coreEntry: PluginEntry;
  coreEntryPath: string;
  sharedDeps: Record<string, any>;
  themeTags: ThemeTag[];
  dist: boolean;
  watch: boolean;
  cache: boolean;
}

function createHostConfig(options: HostConfigOptions): Configuration {
  const {
    repoRoot,
    outputRoot,
    coreEntry,
    coreEntryPath,
    sharedDeps,
    themeTags,
    dist,
    watch,
    cache,
  } = options;

  const outputPath = Path.resolve(outputRoot, 'target/public/bundles/core');

  return {
    name: 'kibana-host',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: coreEntry.contextDir,

    entry: {
      'core.entry': coreEntryPath,
    },

    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: 'auto',
      clean: true,
    },

    experiments: {
      css: true,
    },

    resolve: createResolveConfig(repoRoot),
    module: createModuleConfig(themeTags, repoRoot, dist),

    optimization: createOptimizationConfig(dist),

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(repoRoot, 'node_modules/.cache/rspack-mf/host'),
          buildDependencies: {
            config: [__filename],
          },
        }
      : false,

    plugins: [
      // Module Federation Host
      new rspack.container.ModuleFederationPlugin({
        name: 'kibana_host',
        filename: 'remoteEntry.js',
        exposes: {
          './public': './public/index.ts',
        },
        shared: sharedDeps,
      }),

      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),

      ...(dist ? [] : [new rspack.ProgressPlugin({ prefix: 'core' })]),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}

interface PluginRemoteConfigOptions {
  repoRoot: string;
  outputRoot: string;
  plugin: PluginEntry;
  entryPath: string;
  sharedDeps: Record<string, any>;
  themeTags: ThemeTag[];
  dist: boolean;
  watch: boolean;
  cache: boolean;
}

function createPluginRemoteConfig(options: PluginRemoteConfigOptions): Configuration {
  const {
    repoRoot,
    outputRoot,
    plugin,
    entryPath,
    sharedDeps,
    themeTags,
    dist,
    watch,
    cache,
  } = options;

  const outputPath = Path.resolve(outputRoot, `target/public/bundles/${plugin.id}`);
  const safeName = plugin.id.replace(/-/g, '_');

  return {
    name: plugin.id,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: plugin.contextDir,

    entry: {
      [`${plugin.id}.plugin`]: entryPath,
    },

    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: 'auto',
      clean: true,
    },

    experiments: {
      css: true,
    },

    resolve: createResolveConfig(repoRoot),
    module: createModuleConfig(themeTags, repoRoot, dist),

    optimization: createOptimizationConfig(dist),

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(
            repoRoot,
            `node_modules/.cache/rspack-mf/plugins/${plugin.id}`
          ),
          buildDependencies: {
            config: [__filename],
          },
        }
      : false,

    plugins: [
      // Module Federation Remote
      new rspack.container.ModuleFederationPlugin({
        name: `plugin_${safeName}`,
        filename: 'remoteEntry.js',
        exposes: {
          './public': entryPath,
        },
        shared: sharedDeps,
      }),

      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}

function createResolveConfig(repoRoot: string) {
  return {
    extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
    mainFields: ['browser', 'module', 'main'],
    conditionNames: ['browser', 'module', 'import', 'require', 'default'],
    alias: {
      '@elastic/eui$': '@elastic/eui/optimize/es',
    },
    tsConfig: Path.resolve(repoRoot, 'tsconfig.base.json'),
  };
}

function createModuleConfig(themeTags: ThemeTag[], repoRoot: string, dist: boolean) {
  return {
    rules: [
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
      ...createThemeRules(themeTags, repoRoot, dist),
      {
        test: /\.css$/,
        type: 'css',
      },
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
  };
}

function createOptimizationConfig(dist: boolean) {
  return {
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
