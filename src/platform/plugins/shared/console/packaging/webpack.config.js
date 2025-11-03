/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

require('@kbn/babel-register').install();
const path = require('path');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const { NodeLibsBrowserPlugin } = require('@kbn/node-libs-browser-webpack-plugin');
const sassEmbedded = require('sass-embedded');

const kibanaRoot = path.resolve(__dirname, '../../../../../..');
const entry = require.resolve('./react/index.tsx');
const outputPath = process.env.BUILD_OUTPUT_DIR || path.resolve(__dirname, '../target');
const mode = process.env.NODE_ENV || 'development';
const isProd = mode === 'production';

// Standard externals
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
  // Console-specific externals
  'react-markdown': 'commonjs react-markdown',
  'monaco-editor': 'commonjs monaco-editor',
  rxjs: 'commonjs rxjs',
  lodash: 'commonjs lodash',
};

module.exports = [
  {
    mode,
    entry,
    context: path.dirname(entry),
    devtool: 'source-map',
    output: {
      libraryTarget: 'commonjs',
      path: path.resolve(outputPath),
      filename: 'index.js',
      chunkFilename: '[name].chunk.js',
      publicPath: 'auto',
      chunkLoadingGlobal: 'webpackChunk_standalone_bundle',
    },
    target: 'web',
    externals: [
      standardExternals,
      // Handle react-dom internal imports
      function (context, request, callback) {
        if (/^react-dom\//.test(request)) {
          return callback(null, 'commonjs ' + request);
        }
        callback();
      },
      // Handle monaco-editor internal imports
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
              presets: [require.resolve('@kbn/babel-preset/webpack_preset')],
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
                additionalData(content, loaderContext) {
                  const req = JSON.stringify(
                    loaderContext.utils.contextify(
                      loaderContext.context || loaderContext.rootContext,
                      path.resolve(
                        kibanaRoot,
                        'src/core/public/styles/core_app/_globals_borealislight.scss'
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
    plugins: [
      new CleanWebpackPlugin({
        cleanOnceBeforeBuildPatterns: ['**/*'],
        dangerouslyAllowCleanPatternsOutsideProject: true,
      }),
      new NodeLibsBrowserPlugin(),
    ],
  },
];
