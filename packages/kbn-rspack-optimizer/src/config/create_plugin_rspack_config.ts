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
import { readManifest } from '../utils/manifest_reader';
import { getExternals } from './externals';
import { createThemeRules } from './theme_rules';
import type { PluginEntry, ThemeTag } from '../types';

export interface PluginRspackConfigOptions {
  /** Plugin ID */
  pluginId: string;
  /** Plugin source directory */
  sourceDir: string;
  /** Output directory for built assets */
  outputDir: string;
  /** Path to kibana.json manifest */
  manifestPath: string;
  /** Production/distribution build */
  dist?: boolean;
  /** Enable watch mode */
  watch?: boolean;
  /** Theme tags to build */
  themeTags?: ThemeTag[];
  /** Additional externals for cross-plugin imports */
  coreExternals?: Record<string, string>;
}

/**
 * Create RSPack configuration for building a single third-party plugin
 * Used by @kbn/plugin-helpers
 */
export async function createPluginRspackConfig(
  options: PluginRspackConfigOptions
): Promise<Configuration> {
  const {
    pluginId,
    sourceDir,
    outputDir,
    manifestPath,
    dist = false,
    watch = false,
    themeTags = ['borealislight', 'borealisdark'],
    coreExternals = {},
  } = options;

  // Read manifest to get dependencies
  const manifest = readManifest(manifestPath);

  // Find entry point
  const entryPath = Path.resolve(sourceDir, 'public/index.ts');
  const entryPathTsx = Path.resolve(sourceDir, 'public/index.tsx');
  const actualEntry = Fs.existsSync(entryPath) ? entryPath : entryPathTsx;

  if (!Fs.existsSync(actualEntry)) {
    throw new Error(`No entry point found for plugin ${pluginId} at ${entryPath}`);
  }

  // Combine externals
  const externals = {
    ...getExternals(),
    ...coreExternals,
    // Add cross-plugin imports as externals
    ...createPluginExternals(manifest.requiredPlugins ?? []),
  };

  return {
    name: `plugin-${pluginId}`,
    mode: dist ? 'production' : 'development',
    devtool: dist ? false : 'cheap-module-source-map',
    target: 'web',
    context: sourceDir,

    entry: {
      [pluginId]: actualEntry,
    },

    output: {
      path: outputDir,
      filename: `${pluginId}.plugin.js`,
      chunkFilename: `${pluginId}.chunk.[id].js`,
      publicPath: 'auto',
      clean: !watch,
    },

    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
    },

    externals,

    module: {
      rules: [
        // TypeScript/JavaScript
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: {
                syntax: 'typescript',
                tsx: true,
              },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        // SCSS
        ...createThemeRules(themeTags, sourceDir, dist),
        // CSS
        {
          test: /\.css$/,
          type: 'css',
        },
        // Assets
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf)$/,
          type: 'asset',
        },
      ],
    },

    optimization: {
      moduleIds: dist ? 'deterministic' : 'named',
      chunkIds: dist ? 'deterministic' : 'named',
      minimize: dist,
      minimizer: dist
        ? [
            new rspack.SwcJsMinimizerRspackPlugin({}),
            new rspack.LightningCssMinimizerRspackPlugin({}),
          ]
        : [],
    },

    plugins: [
      new rspack.ProgressPlugin({
        prefix: `@kbn/plugin-helpers [${pluginId}]`,
      }),
    ],

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

/**
 * Create externals for required plugins
 * Maps plugin imports to __kbnBundles__.get() calls
 */
function createPluginExternals(requiredPlugins: string[]): Record<string, string> {
  const externals: Record<string, string> = {};

  for (const pluginId of requiredPlugins) {
    // Common import patterns for plugins
    externals[`@kbn/${pluginId}-plugin`] =
      `var __kbnBundles__.get('plugin/${pluginId}/public')`;
    externals[`@kbn/${pluginId}-plugin/public`] =
      `var __kbnBundles__.get('plugin/${pluginId}/public')`;
    externals[`@kbn/${pluginId}-plugin/common`] =
      `var __kbnBundles__.get('plugin/${pluginId}/common')`;
  }

  // Core is always available
  externals['@kbn/core'] = `var __kbnBundles__.get('entry/core/public')`;
  externals['@kbn/core/public'] = `var __kbnBundles__.get('entry/core/public')`;

  return externals;
}
