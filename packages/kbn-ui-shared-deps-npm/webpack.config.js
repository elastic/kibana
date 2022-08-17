/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const Path = require('path');
const webpack = require('webpack');
const { RawSource } = require('webpack-sources');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CompressionPlugin = require('compression-webpack-plugin');

const UiSharedDepsNpm = require('./src');

const MOMENT_SRC = require.resolve('moment/min/moment-with-locales.js');
const WEBPACK_SRC = require.resolve('webpack');

const REPO_ROOT = Path.resolve(__dirname, '..', '..');

module.exports = (_, argv) => {
  const outputPath = argv.outputPath ? Path.resolve(argv.outputPath) : UiSharedDepsNpm.distDir;

  return {
    node: {
      child_process: 'empty',
      fs: 'empty',
    },
    externals: {
      module: 'module',
    },
    mode: 'production',
    entry: {
      'kbn-ui-shared-deps-npm': [
        // polyfill code
        'core-js/stable',
        'whatwg-fetch',
        'symbol-observable',
        // Parts of node-libs-browser that are used in many places across Kibana
        'buffer',
        'punycode',
        'util',

        /**
         * babel runtime helpers referenced from entry chunks
         * determined by running:
         *
         *  node scripts/build_kibana_platform_plugins --dist --profile
         *  node scripts/find_babel_runtime_helpers_in_use.js
         */
        '@babel/runtime/helpers/assertThisInitialized',
        '@babel/runtime/helpers/asyncToGenerator',
        '@babel/runtime/helpers/classCallCheck',
        '@babel/runtime/helpers/classPrivateFieldGet',
        '@babel/runtime/helpers/classPrivateFieldSet',
        '@babel/runtime/helpers/createClass',
        '@babel/runtime/helpers/createForOfIteratorHelper',
        '@babel/runtime/helpers/createSuper',
        '@babel/runtime/helpers/defineProperty',
        '@babel/runtime/helpers/extends',
        '@babel/runtime/helpers/inherits',
        '@babel/runtime/helpers/inheritsLoose',
        '@babel/runtime/helpers/interopRequireDefault',
        '@babel/runtime/helpers/interopRequireWildcard',
        '@babel/runtime/helpers/objectSpread2',
        '@babel/runtime/helpers/objectWithoutProperties',
        '@babel/runtime/helpers/objectWithoutPropertiesLoose',
        '@babel/runtime/helpers/slicedToArray',
        '@babel/runtime/helpers/taggedTemplateLiteralLoose',
        '@babel/runtime/helpers/toConsumableArray',
        '@babel/runtime/helpers/typeof',
        '@babel/runtime/helpers/wrapNativeSuper',
        '@babel/runtime/regenerator',

        // modules from npm
        '@elastic/charts',
        '@elastic/eui',
        '@elastic/eui/optimize/es/services',
        '@elastic/eui/optimize/es/services/format',
        '@elastic/eui/dist/eui_charts_theme',
        '@elastic/eui/dist/eui_theme_light.json',
        '@elastic/eui/dist/eui_theme_dark.json',
        '@elastic/numeral',
        '@emotion/react',
        'classnames',
        'fflate',
        'history',
        'jquery',
        'lodash',
        'lodash/fp',
        'moment-timezone/moment-timezone',
        'moment-timezone/data/packed/latest.json',
        'moment',
        'react-ace',
        'react-beautiful-dnd',
        'react-dom',
        'react-dom/server',
        'react-router-dom',
        'react-router',
        'react',
        'rison-node',
        'rxjs',
        'rxjs/operators',
        'styled-components',
        'tslib',
      ],
      'kbn-ui-shared-deps-npm.v8.dark': ['@elastic/eui/dist/eui_theme_dark.css'],
      'kbn-ui-shared-deps-npm.v8.light': ['@elastic/eui/dist/eui_theme_light.css'],
    },
    context: __dirname,
    devtool: 'source-map',
    output: {
      path: outputPath,
      filename: '[name].dll.js',
      chunkFilename: 'kbn-ui-shared-deps-npm.chunk.[id].js',
      devtoolModuleFilenameTemplate: (info) =>
        `kbn-ui-shared-deps-npm/${Path.relative(REPO_ROOT, info.absoluteResourcePath)}`,
      library: '__kbnSharedDeps_npm__',
      futureEmitAssets: true,
    },

    module: {
      noParse: [MOMENT_SRC, WEBPACK_SRC],
      rules: [
        {
          include: [require.resolve('jquery')],
          use: [
            {
              loader: UiSharedDepsNpm.publicPathLoader,
              options: {
                key: 'kbn-ui-shared-deps-npm',
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            'css-loader',
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: true,
                postcssOptions: {
                  plugins: [
                    require('autoprefixer')(),
                    require('cssnano')({
                      preset: require('cssnano-preset-default')({ discardComments: false }),
                    }),
                  ],
                },
              },
            },
          ],
        },
      ],
    },

    resolve: {
      alias: {
        '@elastic/eui$': '@elastic/eui/optimize/es',
        moment: MOMENT_SRC,
        // NOTE: Used to include react profiling on bundles
        // https://gist.github.com/bvaughn/25e6233aeb1b4f0cdb8d8366e54a3977#webpack-4
        'react-dom$': 'react-dom/profiling',
        'scheduler/tracing': 'scheduler/tracing-profiling',
      },
      extensions: ['.js', '.ts'],
      symlinks: false,
    },

    optimization: {
      minimizer: [
        new TerserPlugin({
          extractComments: false,
          cache: true,
          parallel: true,
          sourceMap: true,
          terserOptions: {
            compress: true,
            mangle: true,
          },
        }),
      ],
      noEmitOnErrors: true,
    },

    performance: {
      // NOTE: we are disabling this as those hints
      // are more tailored for the final bundles result
      // and not for the webpack compilations performance itself
      hints: false,
    },

    plugins: [
      new CleanWebpackPlugin({
        protectWebpackAssets: false,
        cleanAfterEveryBuildPatterns: [
          'kbn-ui-shared-deps-npm.v8.{dark,light}.{dll.js,dll.js.map}',
          'kbn-ui-shared-deps-npm.v8.{dark,light}-manifest.json',
        ],
      }),
      new MiniCssExtractPlugin({
        filename: '[name].css',
      }),
      new webpack.DllPlugin({
        context: REPO_ROOT,
        path: Path.resolve(outputPath, '[name]-manifest.json'),
        name: '__kbnSharedDeps_npm__',
      }),
      new CompressionPlugin({
        algorithm: 'brotliCompress',
        filename: '[path].br',
        test: /\.(js|css)$/,
        cache: false,
        compressionOptions: {
          level: 11,
        },
      }),
      new (class BundleMetricsPlugin {
        apply(compiler) {
          compiler.hooks.emit.tap('BundleMetricsPlugin', (compilation) => {
            const entries = Object.entries(compilation.assets).map(([id]) => id);
            const fonts = entries.filter((entry) => /\.ttf$/.test(entry));
            const dllAsyncChunks = entries.filter((entry) =>
              /^kbn-ui-shared-deps-npm.chunk.\d*.js$/.test(entry)
            );
            const metrics = [
              {
                group: 'page load bundle size',
                id: 'kbnUiSharedDeps-npmDll',
                value: compilation.assets['kbn-ui-shared-deps-npm.dll.js'].size(),
              },
              {
                group: 'async chunks size',
                id: 'kbnUiSharedDeps-npmDll',
                value: dllAsyncChunks.reduce(
                  (acc, entry) => acc + compilation.assets[entry].size(),
                  0
                ),
              },
              {
                group: 'async chunk count',
                id: 'kbnUiSharedDeps-npmDll',
                value: dllAsyncChunks.length,
              },
              {
                group: 'page load bundle size',
                id: 'kbnUiSharedDeps-npmFonts',
                value: fonts.reduce((acc, entry) => acc + compilation.assets[entry].size(), 0),
              },
              {
                group: 'page load bundle size',
                id: 'kbnUiSharedDeps-npmCss',
                value: compilation.assets['kbn-ui-shared-deps-npm.v8.light.css'].size(),
              },
            ];
            compilation.emitAsset('metrics.json', new RawSource(JSON.stringify(metrics, null, 2)));
          });
        }
      })(),
    ],
  };
};
