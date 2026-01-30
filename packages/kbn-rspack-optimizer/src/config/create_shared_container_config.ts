/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Path from 'path';
import { rspack, type Configuration } from '@rspack/core';
import { generateContainerExposes, ALL_SHARED_DEPS, getExportName } from './shared_deps';
import {
  discoverSharedDeps,
  CORE_SHARED_DEPS,
  type DiscoveredDeps,
} from './shared_deps_discovery';
import type { ThemeTag } from '../types';

export interface SharedContainerConfigOptions {
  /** Repository root path */
  repoRoot: string;
  /** Output root path */
  outputRoot?: string;
  /** Production build */
  dist?: boolean;
  /** Enable caching */
  cache?: boolean;
  /** Theme tags to include */
  themeTags?: ThemeTag[];
  /** Enable auto-discovery of shared deps (default: true) */
  autoDiscover?: boolean;
  /** Minimum plugin usage for auto-discovered deps */
  minPluginUsage?: number;
}

/**
 * Container name for the shared dependencies
 * Used for MF reference: kbnShared./react
 */
export const SHARED_CONTAINER_NAME = 'kbnShared';

/**
 * Chunk names for split chunks strategy
 */
export const SHARED_CHUNKS = {
  REACT: 'shared-react',      // React ecosystem (~500KB)
  ELASTIC: 'shared-elastic',  // @elastic/* (~1.5MB)
  STATE: 'shared-state',      // rxjs, redux (~200KB)
  UTILS: 'shared-utils',      // lodash, moment (~500KB)
  MONACO: 'shared-monaco',    // Monaco editor (~1MB)
  KBN_CORE: 'shared-kbn-core', // Core @kbn/* (~500KB)
  KBN_PACKAGES: 'shared-kbn', // Other @kbn/* (varies)
  VENDORS: 'shared-vendors',  // Other vendors
};

/**
 * Create RSPack configuration for the shared dependencies container.
 *
 * Features:
 * - Auto-discovers shared deps based on plugin usage
 * - Smart chunking: React, Elastic, Utils, Monaco, etc.
 * - Parallel loading of chunks
 * - Better caching (React rarely changes, @kbn/* changes often)
 */
export async function createSharedContainerConfig(
  options: SharedContainerConfigOptions
): Promise<Configuration> {
  const {
    repoRoot,
    outputRoot = repoRoot,
    dist = false,
    cache = true,
    themeTags = ['borealislight', 'borealisdark'],
    autoDiscover = true,
    minPluginUsage = 2,
  } = options;

  const outputPath = Path.resolve(outputRoot, 'target/public/bundles/kbn-shared');

  // Discover shared deps (or use static list)
  let discoveredDeps: DiscoveredDeps;
  if (autoDiscover) {
    // eslint-disable-next-line no-console
    console.log('[rspack] Auto-discovering shared dependencies...');
    discoveredDeps = await discoverSharedDeps({
      repoRoot,
      minPluginUsage,
      includeKbnPackages: true,
    });
    // eslint-disable-next-line no-console
    console.log(
      `[rspack] Found ${discoveredDeps.stats.totalCount} shared deps ` +
      `(${discoveredDeps.stats.coreCount} core + ${discoveredDeps.stats.discoveredCount} discovered)`
    );
  } else {
    // Use static list
    discoveredDeps = {
      all: ALL_SHARED_DEPS,
      byChunk: new Map(),
      stats: { coreCount: ALL_SHARED_DEPS.length, discoveredCount: 0, totalCount: ALL_SHARED_DEPS.length },
    };
  }

  // Generate exposes config
  const exposes: Record<string, string> = {};
  for (const dep of discoveredDeps.all) {
    const exportName = getExportName(dep);
    exposes[`./${exportName}`] = dep.name;
  }

  // eslint-disable-next-line no-console
  console.log(`[rspack] Shared container: ${Object.keys(exposes).length} modules in ${discoveredDeps.byChunk.size} chunks`);

  return {
    name: 'kbn-shared',
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: repoRoot,

    // Entry point - a minimal bootstrap that ensures container is initialized
    entry: {
      'kbn-shared': Path.resolve(__dirname, '../runtime/shared_container_entry.ts'),
    },

    output: {
      path: outputPath,
      filename: '[name].js',
      chunkFilename: '[name].[contenthash:8].js',
      publicPath: 'auto',
      clean: true,
      // Make globally available
      library: {
        type: 'var',
        name: SHARED_CONTAINER_NAME,
      },
    },

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
        // TypeScript/JavaScript
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules\/(?!@kbn|@elastic)/,
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
        // CSS - use RSPack's native CSS support
        {
          test: /\.css$/,
          type: 'css',
        },
        // SCSS - return empty module for shared container
        // (npm packages provide pre-compiled CSS, SCSS processing is for plugins)
        {
          test: /\.scss$/,
          loader: Path.resolve(__dirname, '../loaders/empty_loader.ts'),
        },
        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|ico)$/,
          type: 'asset',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
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
      // Smart chunking for better caching and parallel loading
      splitChunks: {
        chunks: 'all',
        maxInitialRequests: 10,
        maxAsyncRequests: 10,
        cacheGroups: {
          // React ecosystem - rarely changes, cache long
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom|react-router|@emotion|scheduler)[\\/]/,
            name: SHARED_CHUNKS.REACT,
            priority: 40,
            reuseExistingChunk: true,
          },
          // Elastic UI - large, cache separately
          elastic: {
            test: /[\\/]node_modules[\\/]@elastic[\\/]/,
            name: SHARED_CHUNKS.ELASTIC,
            priority: 35,
            reuseExistingChunk: true,
          },
          // Monaco editor - large, lazy loadable
          monaco: {
            test: /[\\/]node_modules[\\/](monaco-editor|react-monaco-editor)[\\/]/,
            name: SHARED_CHUNKS.MONACO,
            priority: 30,
            reuseExistingChunk: true,
          },
          // State management
          state: {
            test: /[\\/]node_modules[\\/](rxjs|redux|react-redux|@reduxjs|immer|reselect)[\\/]/,
            name: SHARED_CHUNKS.STATE,
            priority: 25,
            reuseExistingChunk: true,
          },
          // Common utilities - lodash, moment, etc
          utils: {
            test: /[\\/]node_modules[\\/](lodash|moment|classnames|uuid|tslib|history|query-string|io-ts|fp-ts)[\\/]/,
            name: SHARED_CHUNKS.UTILS,
            priority: 20,
            reuseExistingChunk: true,
          },
          // Core @kbn packages - change more often
          kbnCore: {
            test: /[\\/]packages[\\/].*@kbn[\\/](i18n|std|utility-types|es-query|analytics)[\\/]/,
            name: SHARED_CHUNKS.KBN_CORE,
            priority: 15,
            reuseExistingChunk: true,
          },
          // Other @kbn packages
          kbnPackages: {
            test: /[\\/]packages[\\/].*@kbn[\\/]/,
            name: SHARED_CHUNKS.KBN_PACKAGES,
            priority: 10,
            reuseExistingChunk: true,
          },
          // All other vendors
          vendors: {
            test: /[\\/]node_modules[\\/]/,
            name: SHARED_CHUNKS.VENDORS,
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      },
    },

    cache: cache
      ? {
          type: 'filesystem',
          cacheDirectory: Path.resolve(repoRoot, 'node_modules/.cache/rspack-shared'),
          buildDependencies: {
            config: [__filename],
          },
        }
      : false,

    plugins: [
      // Module Federation Container
      new rspack.container.ModuleFederationPlugin({
        name: SHARED_CONTAINER_NAME,
        filename: 'remoteEntry.js',
        exposes,
        // The container doesn't share - it IS the source
        shared: {},
      }),

      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),

      new rspack.ProgressPlugin({
        prefix: 'kbn-shared',
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },
  };
}

/**
 * Generate the entry file content for the shared container
 * This ensures all exposed modules are bundled
 */
export function generateSharedContainerEntry(): string {
  const imports: string[] = [];
  const exports: string[] = [];

  for (const dep of ALL_SHARED_DEPS) {
    const exportName = getExportName(dep);
    const safeName = exportName.replace(/[^a-zA-Z0-9_]/g, '_');

    imports.push(`import * as ${safeName} from '${dep.name}';`);
    exports.push(`  '${exportName}': ${safeName},`);

    // Handle sub-paths
    if (dep.subPaths) {
      for (const subPath of dep.subPaths) {
        const subExportName = subPath.replace(/[/@-]/g, '_');
        const subSafeName = subExportName.replace(/[^a-zA-Z0-9_]/g, '_');
        imports.push(`import * as ${subSafeName} from '${subPath}';`);
        exports.push(`  '${subExportName}': ${subSafeName},`);
      }
    }
  }

  return `
/**
 * AUTO-GENERATED - Shared dependencies container entry
 * This file ensures all shared modules are bundled into the container.
 */

${imports.join('\n')}

// Export mapping for debugging/introspection
export const sharedModules = {
${exports.join('\n')}
};

// Mark container as initialized
(window as any).__kbnSharedReady = true;
`;
}
