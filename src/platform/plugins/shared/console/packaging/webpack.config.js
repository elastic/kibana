/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/babel-register').install();
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const path = require('path');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');
// const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');
const ConsoleDefinitionsPlugin = require('./console-definitions-plugin');
const webpack = require('webpack');

const KIBANA_ROOT = path.resolve(__dirname, '../../../../../..');
const isProd = process.env.NODE_ENV === 'production';

const BABEL_PRESET = require.resolve('@kbn/babel-preset/webpack_preset');

module.exports = [
  // React bundle configuration
  {
    mode: process.env.NODE_ENV || 'development',
    entry: require.resolve('./react/index.tsx'),
    context: __dirname,
    devtool: 'cheap-source-map',
    output: {
      libraryTarget: 'commonjs',
      path: path.resolve(__dirname, '../target/react'),
      filename: 'index.js',
      chunkFilename: '[name].chunk.js',
      publicPath: 'auto',
      chunkLoadingGlobal: 'webpackChunk_console_react_bundle',
    },
    target: 'web',
    devtool: 'source-map',
    externals: [
      {
        '@elastic/eui': 'commonjs @elastic/eui',
        '@emotion/css': 'commonjs @emotion/css',
        '@emotion/react': 'commonjs @emotion/react',
        classnames: 'commonjs classnames',
        react: 'commonjs react',
        lodash: 'commonjs lodash',
        'react-dom': 'commonjs react-dom',
        'react-markdown': 'commonjs react-markdown',
        moment: 'commonjs moment',
        '@elastic/eui': 'commonjs @elastic/eui',
        rxjs: 'commonjs rxjs',
        'moment-duration-format': 'commonjs moment-duration-format',
        'moment-timezone': 'commonjs moment-timezone',
        '@elastic/datemath': 'commonjs @elastic/datemath',
        'monaco-editor': 'commonjs monaco-editor',
        '@kbn/monaco': 'commonjs @kbn/monaco',
      },
      // Handle react-dom internal imports only
      function (context, request, callback) {
        if (/^react-dom\//.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
      function (context, request, callback) {
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
          test: /\.(js|tsx?)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              envName: 'development',
              presets: [BABEL_PRESET],
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
          use: [
            { loader: 'style-loader' },
            { loader: 'css-loader' },
            {
              loader: 'postcss-loader',
              options: {
                postcssOptions: {
                  config: require.resolve('./postcss.config.js'),
                },
              },
            },
            {
              loader: 'string-replace-loader',
              options: {
                search: '__REPLACE_WITH_PUBLIC_PATH__',
                replace: '/',
                flags: 'g',
              },
            },
          ],
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
                implementation: require('sass-embedded'),
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
                additionalData(content, loaderContext) {
                  const req = JSON.stringify(
                    loaderContext.utils.contextify(
                      loaderContext.context || loaderContext.rootContext,
                      path.resolve(
                        KIBANA_ROOT,
                        'src/core/public/styles/core_app/_globals_v8light.scss'
                      )
                    )
                  );
                  return `@import ${req};\n${content}`;
                },
                implementation: require('sass-embedded'),
                sassOptions: {
                  outputStyle: 'expanded',
                  includePaths: [path.resolve(KIBANA_ROOT, 'node_modules')],
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

    plugins: [
      new NodeLibsBrowserPlugin(),
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path.resolve(__dirname, '../target/react/**/*')],
      }),
      // new MonacoWebpackPlugin({}),
      new BundleAnalyzerPlugin()
    ],
  },

  // Server bundle configuration
  {
    mode: process.env.NODE_ENV || 'development',
    entry: require.resolve('./server/index.ts'),
    context: __dirname,
    devtool: 'cheap-source-map',
    output: {
      libraryTarget: 'commonjs',
      path: path.resolve(__dirname, '../target/server'),
      filename: 'index.js',
      publicPath: '',
    },
    target: 'node',
    devtool: 'source-map',
    externals: [
      // Externalize Node.js built-ins and npm packages, but not relative imports
      function (context, request, callback) {
        // Don't externalize relative imports
        if (request.startsWith('.') || request.startsWith('/')) {
          return callback();
        }
        // Externalize Node.js built-ins and npm packages
        if (/^[a-z@]/.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
    ],
    module: {
      rules: [
        {
          test: /\.(js|tsx?)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              envName: 'development',
              presets: [BABEL_PRESET],
            },
          },
        },
      ],
    },
    resolve: {
      alias: {},
      extensions: ['.js', '.ts', '.tsx'],
    },
    optimization: {
      minimize: false,
      noEmitOnErrors: true,
      splitChunks: false,
    },
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: [path.resolve(__dirname, '../target/server/**/*')],
      }),
      new ConsoleDefinitionsPlugin({
        from: path.resolve(__dirname, 'server/console_definitions'),
        to: path.resolve(__dirname, '../target/server/console_definitions'),
      }),
    ],
  },
];
