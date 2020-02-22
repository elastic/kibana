/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import Path from 'path';

import { stringifyRequest } from 'loader-utils';
import webpack from 'webpack';
// @ts-ignore
import TerserPlugin from 'terser-webpack-plugin';
// @ts-ignore
import webpackMerge from 'webpack-merge';
// @ts-ignore
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import * as SharedDeps from '@kbn/ui-shared-deps';

import { Bundle, WorkerConfig } from '../common';

const IS_CODE_COVERAGE = !!process.env.CODE_COVERAGE;
const ISTANBUL_PRESET_PATH = require.resolve('@kbn/babel-preset/istanbul_preset');
const PUBLIC_PATH_PLACEHOLDER = '__REPLACE_WITH_PUBLIC_PATH__';
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');

export function getWebpackConfig(bundle: Bundle, worker: WorkerConfig) {
  const commonConfig: webpack.Configuration = {
    node: { fs: 'empty' },
    context: bundle.contextDir,
    cache: true,
    entry: {
      [bundle.id]: bundle.entry,
    },

    devtool: worker.dist ? false : '#cheap-source-map',
    profile: worker.profileWebpack,

    output: {
      path: bundle.outputDir,
      filename: '[name].plugin.js',
      publicPath: PUBLIC_PATH_PLACEHOLDER,
      devtoolModuleFilenameTemplate: info =>
        `/${bundle.type}:${bundle.id}/${Path.relative(
          bundle.sourceRoot,
          info.absoluteResourcePath
        )}${info.query}`,
      jsonpFunction: `${bundle.id}_bundle_jsonpfunction`,
      ...(bundle.type === 'plugin'
        ? {
            // When the entry point is loaded, assign it's exported `plugin`
            // value to a key on the global `__kbnBundles__` object.
            library: ['__kbnBundles__', `plugin/${bundle.id}`],
            libraryExport: 'plugin',
          }
        : {}),
    },

    optimization: {
      noEmitOnErrors: true,
    },

    externals: {
      ...SharedDeps.externals,
    },

    plugins: [new CleanWebpackPlugin()],

    module: {
      // no parse rules for a few known large packages which have no require() statements
      noParse: [
        /[\///]node_modules[\///]elasticsearch-browser[\///]/,
        /[\///]node_modules[\///]lodash[\///]index\.js/,
      ],

      rules: [
        {
          test: /\.css$/,
          include: /node_modules/,
          use: [
            {
              loader: 'style-loader',
            },
            {
              loader: 'css-loader',
              options: {
                sourceMap: !worker.dist,
              },
            },
          ],
        },
        {
          test: /\.scss$/,
          exclude: /node_modules/,
          oneOf: [
            {
              resourceQuery: /dark|light/,
              use: [
                {
                  loader: 'style-loader',
                },
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: !worker.dist,
                  },
                },
                {
                  loader: 'postcss-loader',
                  options: {
                    sourceMap: !worker.dist,
                    config: {
                      path: require.resolve('./postcss.config'),
                    },
                  },
                },
                {
                  loader: 'resolve-url-loader',
                  options: {
                    join: (_: string, __: any) => (uri: string, base?: string) => {
                      if (!base) {
                        return null;
                      }

                      // manually force ui/* urls in legacy styles to resolve to ui/legacy/public
                      if (uri.startsWith('ui/') && base.split(Path.sep).includes('legacy')) {
                        return Path.resolve(
                          worker.repoRoot,
                          'src/legacy/ui/public',
                          uri.replace('ui/', '')
                        );
                      }

                      return null;
                    },
                  },
                },
                {
                  loader: 'sass-loader',
                  options: {
                    sourceMap: !worker.dist,
                    prependData(loaderContext: webpack.loader.LoaderContext) {
                      return `@import ${stringifyRequest(
                        loaderContext,
                        Path.resolve(
                          worker.repoRoot,
                          'src/legacy/ui/public/styles/_styling_constants.scss'
                        )
                      )};\n`;
                    },
                    webpackImporter: false,
                    implementation: require('node-sass'),
                    sassOptions(loaderContext: webpack.loader.LoaderContext) {
                      const darkMode = loaderContext.resourceQuery === '?dark';

                      return {
                        outputStyle: 'nested',
                        includePaths: [Path.resolve(worker.repoRoot, 'node_modules')],
                        sourceMapRoot: `/${bundle.type}:${bundle.id}`,
                        importer: (url: string) => {
                          if (darkMode && url.includes('eui_colors_light')) {
                            return { file: url.replace('eui_colors_light', 'eui_colors_dark') };
                          }

                          return { file: url };
                        },
                      };
                    },
                  },
                },
              ],
            },
            {
              loader: require.resolve('./theme_loader'),
            },
          ],
        },
        {
          test: /\.(woff|woff2|ttf|eot|svg|ico|png|jpg|gif|jpeg)(\?|$)/,
          loader: 'url-loader',
          options: {
            limit: 8192,
          },
        },
        {
          test: /\.(js|tsx?)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              presets: IS_CODE_COVERAGE
                ? [ISTANBUL_PRESET_PATH, BABEL_PRESET_PATH]
                : [BABEL_PRESET_PATH],
            },
          },
        },
        {
          test: /\.(html|md|txt|tmpl)$/,
          use: {
            loader: 'raw-loader',
          },
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json'],
      alias: {
        tinymath: require.resolve('tinymath/lib/tinymath.es5.js'),
      },
    },

    performance: {
      // NOTE: we are disabling this as those hints
      // are more tailored for the final bundles result
      // and not for the webpack compilations performance itself
      hints: false,
    },
  };

  const nonDistributableConfig: webpack.Configuration = {
    mode: 'development',
  };

  const distributableConfig: webpack.Configuration = {
    mode: 'production',

    plugins: [
      new webpack.DefinePlugin({
        'process.env': {
          IS_KIBANA_DISTRIBUTABLE: `"true"`,
        },
      }),
    ],

    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: false,
          sourceMap: false,
          extractComments: false,
          terserOptions: {
            compress: false,
            mangle: false,
          },
        }),
      ],
    },
  };

  return webpackMerge(commonConfig, worker.dist ? distributableConfig : nonDistributableConfig);
}
