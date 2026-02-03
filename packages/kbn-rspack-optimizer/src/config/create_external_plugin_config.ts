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
import { getExternals } from './externals';
import {
  getSharedResolveConfig,
  getSharedResolveFallback,
  getSharedModuleRules,
  getSharedIgnoreWarnings,
} from './shared_config';
import type { ThemeTag } from '../types';

export interface ExternalPluginConfigOptions {
  /** Path to the Kibana repository root */
  repoRoot: string;
  /** Path to the plugin source directory */
  pluginDir: string;
  /** Plugin ID from kibana.json */
  pluginId: string;
  /** Output directory for the built bundle */
  outputDir: string;
  /** Build for production (minified) */
  dist?: boolean;
  /** Watch mode */
  watch?: boolean;
  /** Enable caching */
  cache?: boolean;
  /** Theme tags to compile (default: borealislight, borealisdark) */
  themeTags?: ThemeTag[];
}

/**
 * Create an RSPack configuration for building an EXTERNAL/third-party plugin.
 *
 * This config shares most of its configuration with the main Kibana build
 * (via shared_config.ts) to ensure consistency. The differences are:
 *
 * 1. Single plugin entry instead of unified entry
 * 2. Externalizes cross-plugin imports to __kbnBundles__.get()
 * 3. Output goes to a separate directory
 *
 * The output bundle can be loaded after kibana.bundle.js and will integrate
 * seamlessly with the Kibana plugin system.
 */
export async function createExternalPluginConfig(
  options: ExternalPluginConfigOptions
): Promise<Configuration> {
  const {
    repoRoot,
    pluginDir,
    pluginId,
    outputDir,
    dist = false,
    watch = false,
    cache = true,
    themeTags = ['borealislight', 'borealisdark'] as ThemeTag[],
  } = options;

  // Find entry point
  const entryPath = findEntry(pluginDir);
  if (!entryPath) {
    throw new Error(`No entry point found in ${pluginDir}/public/`);
  }

  // Create wrapper entry that registers with __kbnBundles__
  const wrapperDir = Path.resolve(outputDir, '.rspack-wrappers');
  if (!Fs.existsSync(wrapperDir)) {
    Fs.mkdirSync(wrapperDir, { recursive: true });
  }

  const wrapperPath = createPluginWrapper(wrapperDir, pluginId, entryPath);

  // Get shared deps externals (React, EUI, etc.) - same as main build
  const sharedDepsExternals = getExternals();

  // eslint-disable-next-line no-console
  console.log(`[rspack] Building external plugin: ${pluginId}`);

  return {
    name: `plugin-${pluginId}`,
    mode: dist ? 'production' : 'development',
    // Match legacy webpack optimizer: no sourcemaps in dist, cheap-source-map in dev
    devtool: dist ? false : 'cheap-source-map',
    target: 'web',
    context: pluginDir,

    entry: {
      [pluginId]: wrapperPath,
    },

    output: {
      path: outputDir,
      filename: `${pluginId}.plugin.js`,
      // Short hash names in production, descriptive names in development
      chunkFilename: dist
        ? `${pluginId}.[contenthash:8].js`
        : `${pluginId}.[name].[contenthash:8].js`,
      publicPath: 'auto',
      clean: !watch,
    },

    // Externalize shared deps AND cross-plugin imports
    externals: [
      // Static externals for npm shared deps (same as main build)
      sharedDepsExternals,
      // Dynamic externals for cross-plugin imports (different from main build)
      // Main build bundles these together; external plugins must use __kbnBundles__
      createCrossPluginExternals(),
    ],

    // Use shared resolve config + fallbacks
    resolve: {
      ...getSharedResolveConfig(repoRoot),
      fallback: getSharedResolveFallback(),
    },

    module: {
      // Use shared module rules (same loaders as main build)
      // SWC for performance + require_interop_loader for ESM/CJS interop
      rules: getSharedModuleRules(repoRoot, dist, themeTags, `plugin-${pluginId}`),
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      splitChunks: {
        chunks: 'async',
      },
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
          ]
        : [],
    },

    experiments: {
      // Persistent cache for faster rebuilds
      cache: cache
        ? {
            type: 'persistent',
            // Build dependencies - cache is invalidated when any of these change
            buildDependencies: [
              // Plugin's own package.json
              Path.resolve(pluginDir, 'package.json'),
              // RSPack optimizer config files
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/externals.ts'),
              Path.resolve(repoRoot, 'packages/kbn-rspack-optimizer/src/config/shared_config.ts'),
              // Shared deps built outputs - invalidate when shared deps are rebuilt
              Path.resolve(
                repoRoot,
                'target/build/src/platform/packages/private/kbn-ui-shared-deps-npm/shared_built_assets/kbn-ui-shared-deps-npm.dll.js'
              ),
              Path.resolve(
                repoRoot,
                'target/build/src/platform/packages/private/kbn-ui-shared-deps-src/shared_built_assets/kbn-ui-shared-deps-src.js'
              ),
            ],
            version: `external-plugin-v2-${dist ? 'prod' : 'dev'}`,
          }
        : false,
    },

    plugins: [
      // Same plugins as main build
      new NodeLibsBrowserPlugin() as any,
      new rspack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(dist ? 'production' : 'development'),
      }),
      new rspack.ProgressPlugin({
        prefix: `plugin:${pluginId}`,
      }),
    ],

    stats: {
      preset: 'errors-warnings',
      timings: true,
    },

    // Use shared ignore warnings
    ignoreWarnings: getSharedIgnoreWarnings(),
  };
}

/**
 * Create externals function for cross-plugin imports.
 * External plugins must use __kbnBundles__.get() to access other plugins
 * since they're not bundled together like the main build.
 */
function createCrossPluginExternals(): (data: { request?: string }) => string | undefined {
  return (data: { request?: string }): string | undefined => {
    const { request } = data;
    if (!request) return undefined;

    // Externalize @kbn/*-plugin imports to __kbnBundles__.get()
    if (request.startsWith('@kbn/') && request.includes('-plugin')) {
      const parts = request.split('/');
      const pkgId = parts.slice(0, 2).join('/');
      const target = parts[2] || 'public';

      if (target === 'public' || target === 'common') {
        // Convert package ID to plugin ID
        // e.g., @kbn/triggers-actions-ui-plugin -> triggersActionsUi
        const pluginIdFromPkg = convertPkgIdToPluginId(pkgId);
        const bundleId = `plugin/${pluginIdFromPkg}/${target}`;
        return `__kbnBundles__.get('${bundleId}')`;
      }
    }

    // Externalize @kbn/core imports
    if (request === '@kbn/core/public' || request.startsWith('@kbn/core/public/')) {
      return `__kbnBundles__.get('entry/core/public')`;
    }

    return undefined;
  };
}

/**
 * Convert package ID to plugin ID.
 * e.g., @kbn/triggers-actions-ui-plugin -> triggersActionsUi
 */
function convertPkgIdToPluginId(pkgId: string): string {
  // Remove @kbn/ prefix and -plugin suffix
  let id = pkgId.replace('@kbn/', '').replace(/-plugin$/, '');

  // Convert kebab-case to camelCase
  id = id.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());

  return id;
}

function findEntry(pluginDir: string): string | null {
  const publicDir = Path.join(pluginDir, 'public');
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
 * 1. Imports the plugin entry
 * 2. Registers it with __kbnBundles__
 */
function createPluginWrapper(
  wrapperDir: string,
  pluginId: string,
  realEntryPath: string
): string {
  const wrapperPath = Path.join(wrapperDir, `${pluginId}-wrapper.js`);

  const content = `
// Auto-generated wrapper for external plugin: ${pluginId}
// This registers the plugin with Kibana's __kbnBundles__ system

import * as pluginModule from ${JSON.stringify(realEntryPath)};

// Register with __kbnBundles__ for Kibana to discover
if (typeof __kbnBundles__ === 'undefined') {
  throw new Error(
    'External plugin "${pluginId}" loaded before Kibana bundles. ' +
    'Make sure to load this plugin after kibana.bundle.js'
  );
}

__kbnBundles__.define(
  'plugin/${pluginId}/public',
  function bundleRequire(key) {
    return pluginModule;
  },
  'plugin/${pluginId}/public'
);

// Also export for potential direct imports
export * from ${JSON.stringify(realEntryPath)};
export default pluginModule;
`;

  Fs.writeFileSync(wrapperPath, content);
  return wrapperPath;
}
