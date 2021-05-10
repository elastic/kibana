/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const CompressionPlugin = require('compression-webpack-plugin');
const { REPO_ROOT } = require('@kbn/utils');
const webpack = require('webpack');
const { RawSource } = require('webpack-sources');

const UiSharedDeps = require('./index');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');

exports.getWebpackConfig = ({ dev = false } = {}) => ({
  mode: dev ? 'development' : 'production',
  entry: {
    'kbn-ui-shared-deps': './entry.js',
    'kbn-ui-shared-deps.v7.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
    'kbn-ui-shared-deps.v7.light': ['@elastic/eui/dist/eui_theme_light.css'],
    'kbn-ui-shared-deps.v8.dark': ['@elastic/eui/dist/eui_theme_amsterdam_dark.css'],
    'kbn-ui-shared-deps.v8.light': ['@elastic/eui/dist/eui_theme_amsterdam_light.css'],
  },
  context: __dirname,
  devtool: dev ? '#cheap-source-map' : false,
  output: {
    path: UiSharedDeps.distDir,
    filename: '[name].js',
    sourceMapFilename: '[file].map',
    devtoolModuleFilenameTemplate: (info) =>
      `kbn-ui-shared-deps/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
    library: '__kbnSharedDeps__',
  },

  module: {
    noParse: [MOMENT_SRC],
    rules: [
      {
        include: [require.resolve('./entry.js')],
        use: [
          {
            loader: UiSharedDeps.publicPathLoader,
            options: {
              key: 'kbn-ui-shared-deps',
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader'],
      },
      {
        include: [require.resolve('./theme.ts')],
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
            },
          },
        ],
      },
      {
        test: !dev ? /[\\\/]@elastic[\\\/]eui[\\\/].*\.js$/ : () => false,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: [
                [
                  require.resolve('babel-plugin-transform-react-remove-prop-types'),
                  {
                    mode: 'remove',
                    removeImport: true,
                  },
                ],
              ],
            },
          },
        ],
      },
      {
        test: /\.(ttf)(\?|$)/,
        loader: 'url-loader',
        options: {
          limit: 8192,
        },
      },
    ],
  },

  resolve: {
    alias: {
      moment: MOMENT_SRC,
    },
    extensions: ['.js', '.ts'],
    symlinks: false,
  },

  optimization: {
    minimizer: [
      new CssMinimizerPlugin({
        minimizerOptions: {
          preset: [
            'default',
            {
              discardComments: false,
            },
          ],
        },
      }),
      new TerserPlugin({
        cache: false,
        sourceMap: false,
        extractComments: false,
        parallel: false,
        terserOptions: {
          compress: true,
          mangle: true,
        },
      }),
    ],
    noEmitOnErrors: true,
    splitChunks: {
      cacheGroups: {
        'kbn-ui-shared-deps.@elastic': {
          name: 'kbn-ui-shared-deps.@elastic',
          test: (m) => m.resource && m.resource.includes('@elastic'),
          chunks: 'all',
          enforce: true,
        },
      },
    },
  },

  performance: {
    // NOTE: we are disabling this as those hints
    // are more tailored for the final bundles result
    // and not for the webpack compilations performance itself
    hints: false,
  },

  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': dev ? '"development"' : '"production"',
    }),
    ...(dev
      ? []
      : [
          new CompressionPlugin({
            algorithm: 'brotliCompress',
            filename: '[path].br',
            test: /\.(js|css)$/,
            cache: false,
          }),
          new CompressionPlugin({
            algorithm: 'gzip',
            filename: '[path].gz',
            test: /\.(js|css)$/,
            cache: false,
          }),
          new (class MetricsPlugin {
            apply(compiler) {
              compiler.hooks.emit.tap('MetricsPlugin', (compilation) => {
                const metrics = [
                  {
                    group: 'page load bundle size',
                    id: 'kbnUiSharedDeps-js',
                    value: compilation.assets['kbn-ui-shared-deps.js'].size(),
                  },
                  {
                    group: 'page load bundle size',
                    id: 'kbnUiSharedDeps-css',
                    value:
                      compilation.assets['kbn-ui-shared-deps.css'].size() +
                      compilation.assets['kbn-ui-shared-deps.v7.light.css'].size(),
                  },
                  {
                    group: 'page load bundle size',
                    id: 'kbnUiSharedDeps-elastic',
                    value: compilation.assets['kbn-ui-shared-deps.@elastic.js'].size(),
                  },
                ];

                compilation.emitAsset(
                  'metrics.json',
                  new RawSource(JSON.stringify(metrics, null, 2))
                );
              });
            }
          })(),
        ]),
  ],
});
