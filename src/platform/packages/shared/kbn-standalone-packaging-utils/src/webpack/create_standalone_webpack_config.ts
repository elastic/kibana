/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable @kbn/imports/no_boundary_crossing */
// This is a Node.js-only webpack config generator that imports build-time dependencies

import path from 'path';
import type { Configuration } from 'webpack';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';
import sassEmbedded from 'sass-embedded';

export interface StandaloneWebpackOptions {
  /**
   * Entry point for the webpack bundle
   */
  entry: string;

  /**
   * Output directory for the built files
   */
  outputPath: string;

  /**
   * Output filename (default: 'index.js')
   */
  outputFilename?: string;

  /**
   * Chunk filename pattern (default: '[name].chunk.js')
   */
  chunkFilename?: string;

  /**
   * External dependencies that won't be bundled
   * Common externals are automatically included (React, ReactDOM, Monaco, EUI, etc.)
   */
  additionalExternals?: Record<string, string> | string[];

  /**
   * Webpack mode (default: process.env.NODE_ENV || 'development')
   */
  mode?: 'development' | 'production';

  /**
   * Enable bundle analyzer (default: false)
   */
  enableBundleAnalyzer?: boolean;

  /**
   * Path to Kibana root (default: resolves from current directory)
   */
  kibanaRoot?: string;

  /**
   * Path to Babel preset (default: '@kbn/babel-preset/webpack_preset')
   */
  babelPreset?: string;

  /**
   * Additional webpack plugins
   */
  additionalPlugins?: any[];

  /**
   * Clean output directory before build (default: true)
   */
  cleanOutputDir?: boolean;

  /**
   * Enable source maps (default: true)
   */
  sourceMaps?: boolean;

  /**
   * Library target (default: 'commonjs')
   */
  libraryTarget?: string;
}

/**
 * Creates a webpack configuration for standalone Kibana plugin packaging.
 * This provides sensible defaults for bundling Kibana plugins as standalone components.
 *
 * @param options - Configuration options
 * @returns Webpack configuration object
 *
 * @example
 * ```ts
 * const config = createStandaloneWebpackConfig({
 *   entry: './react/index.tsx',
 *   outputPath: '../target',
 *   enableBundleAnalyzer: true,
 *   additionalExternals: {
 *     'my-custom-lib': 'commonjs my-custom-lib',
 *   },
 * });
 * ```
 */
export function createStandaloneWebpackConfig(options: StandaloneWebpackOptions): Configuration {
  const {
    entry,
    outputPath,
    outputFilename = 'index.js',
    chunkFilename = '[name].chunk.js',
    additionalExternals = {},
    mode = (process.env.NODE_ENV as 'development' | 'production') || 'development',
    enableBundleAnalyzer = false,
    kibanaRoot = path.resolve(__dirname, '../../../..'),
    babelPreset = require.resolve('@kbn/babel-preset/webpack_preset'),
    additionalPlugins = [],
    cleanOutputDir = true,
    sourceMaps = true,
    libraryTarget = 'commonjs',
  } = options;

  const isProd = mode === 'production';

  // Standard externals that are commonly needed across all standalone packages
  const standardExternals = {
    '@elastic/eui': 'commonjs @elastic/eui',
    '@emotion/css': 'commonjs @emotion/css',
    '@emotion/react': 'commonjs @emotion/react',
    classnames: 'commonjs classnames',
    react: 'commonjs react',
    'react-dom': 'commonjs react-dom',
    moment: 'commonjs moment',
    'moment-duration-format': 'commonjs moment-duration-format',
    'moment-timezone': 'commonjs moment-timezone',
    '@elastic/datemath': 'commonjs @elastic/datemath',
  };

  // Merge standard externals with additional externals
  const mergedExternals = Array.isArray(additionalExternals)
    ? [standardExternals, ...additionalExternals]
    : { ...standardExternals, ...additionalExternals };

  const plugins: any[] = [];

  // Add CleanWebpackPlugin
  if (cleanOutputDir) {
    plugins.push(
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['**/*'],
        dangerouslyAllowCleanPatternsOutsideProject: true,
      })
    );
  }

  // Add BundleAnalyzerPlugin
  if (enableBundleAnalyzer) {
    plugins.push(new BundleAnalyzerPlugin());
  }

  // Add NodeLibsBrowserPlugin
  plugins.push(new NodeLibsBrowserPlugin());

  // Add additional plugins
  plugins.push(...additionalPlugins);

  return {
    mode,
    entry,
    context: path.dirname(entry),
    devtool: sourceMaps ? 'source-map' : false,
    output: {
      libraryTarget,
      path: path.resolve(outputPath),
      filename: outputFilename,
      chunkFilename,
      publicPath: 'auto',
      chunkLoadingGlobal: 'webpackChunk_standalone_bundle',
    },
    target: 'web',
    externals: [
      mergedExternals,
      // Handle react-dom internal imports
      function (context: any, request: string, callback: Function) {
        if (/^react-dom\//.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
      // Handle monaco-editor internal imports
      function (context: any, request: string, callback: Function) {
        if (/^monaco-editor\/(esm\/vs|esm|lib|min)/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    module: {
      rules: [
        {
          test: /\.(woff|woff2|ttf|eot|svg|ico|png|jpg|gif|jpeg)(\?|$)/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8192,
            },
          },
        },
        {
          test: /\.peggy$/,
          loader: require.resolve('@kbn/peggy-loader'),
        },
        {
          test: /\.(js|tsx?)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              envName: mode,
              presets: [babelPreset],
            },
          },
        },
        {
          test: /\.html$/,
          loader: 'html-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          exclude: /components/,
          use: [{ loader: 'style-loader' }, { loader: 'css-loader' }],
          sideEffects: true,
        },
        {
          test: /\.module\.s(a|c)ss$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  localIdentName: '[name]__[local]___[hash:base64:5]',
                  exportLocalsConvention: 'camelCase',
                },
                sourceMap: !isProd,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  config: require.resolve('@kbn/optimizer/postcss.config'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                implementation: sassEmbedded,
                sourceMap: !isProd,
                sassOptions: {
                  quietDeps: true,
                },
              },
            },
          ],
        },
        {
          test: /\.scss$/,
          exclude: [/node_modules/, /\.module\.s(a|c)ss$/],
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !isProd,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !isProd,
                postcssOptions: {
                  config: require.resolve('@kbn/optimizer/postcss.config'),
                },
              },
            },
            {
              loader: 'sass-loader',
              options: {
                additionalData(content: string, loaderContext: any) {
                  const req = JSON.stringify(
                    loaderContext.utils.contextify(
                      loaderContext.context || loaderContext.rootContext,
                      path.resolve(
                        kibanaRoot,
                        'src/core/public/styles/core_app/_globals_v8light.scss'
                      )
                    )
                  );
                  return `@import ${req};\n${content}`;
                },
                implementation: sassEmbedded,
                sassOptions: {
                  outputStyle: 'expanded',
                  includePaths: [path.resolve(kibanaRoot, 'node_modules')],
                  quietDeps: true,
                },
              },
            },
          ],
        },
      ],
    },
    resolve: {
      alias: {},
      extensions: ['.js', '.ts', '.tsx', '.scss', '.css'],
    },
    optimization: {
      minimize: false,
      noEmitOnErrors: true,
      splitChunks: false,
      runtimeChunk: false,
    },
    plugins,
  } as Configuration;
}
