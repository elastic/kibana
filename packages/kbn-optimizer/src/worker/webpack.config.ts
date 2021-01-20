/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Path from 'path';

import { stringifyRequest } from 'loader-utils';
import webpack from 'webpack';
// @ts-expect-error
import TerserPlugin from 'terser-webpack-plugin';
import webpackMerge from 'webpack-merge';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

import { Bundle, BundleRefs, WorkerConfig } from '../common';
import { BundleRefsPlugin } from './bundle_refs_plugin';

const IS_CODE_COVERAGE = !!process.env.CODE_COVERAGE;
const ISTANBUL_PRESET_PATH = require.resolve('@kbn/babel-preset/istanbul_preset');
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');

export function getWebpackConfig(bundle: Bundle, bundleRefs: BundleRefs, worker: WorkerConfig) {
  const ENTRY_CREATOR = require.resolve('./entry_point_creator');

  const commonConfig: webpack.Configuration = {
    node: { fs: 'empty' },
    context: bundle.contextDir,
    cache: true,
    entry: {
      [bundle.id]: ENTRY_CREATOR,
    },

    devtool: worker.dist ? false : '#cheap-source-map',
    profile: worker.profileWebpack,

    output: {
      path: bundle.outputDir,
      filename: `${bundle.id}.${bundle.type}.js`,
      chunkFilename: `${bundle.id}.chunk.[id].js`,
      devtoolModuleFilenameTemplate: (info) =>
        `/${bundle.type}:${bundle.id}/${Path.relative(
          bundle.sourceRoot,
          info.absoluteResourcePath
        )}${info.query}`,
      jsonpFunction: `${bundle.id}_bundle_jsonpfunction`,
    },

    optimization: {
      noEmitOnErrors: true,
      splitChunks: {
        maxAsyncRequests: 10,
        cacheGroups: {
          default: {
            reuseExistingChunk: false,
          },
        },
      },
    },

    externals: [UiSharedDeps.externals],

    plugins: [
      new CleanWebpackPlugin(),
      new BundleRefsPlugin(bundle, bundleRefs),
      ...(bundle.banner ? [new webpack.BannerPlugin({ banner: bundle.banner, raw: true })] : []),
    ],

    module: {
      // no parse rules for a few known large packages which have no require() statements
      // or which have require() statements that should be ignored because the file is
      // already bundled with all its necessary depedencies
      noParse: [
        /[\/\\]node_modules[\/\\]lodash[\/\\]index\.js$/,
        /[\/\\]node_modules[\/\\]vega[\/\\]build[\/\\]vega\.js$/,
      ],

      rules: [
        {
          include: [ENTRY_CREATOR],
          use: [
            {
              loader: UiSharedDeps.publicPathLoader,
              options: {
                key: bundle.id,
              },
            },
            {
              loader: require.resolve('val-loader'),
              options: {
                entries: bundle.publicDirNames.map((name) => {
                  const absolute = Path.resolve(bundle.contextDir, name);
                  const newContext = Path.dirname(ENTRY_CREATOR);
                  const importId = `${bundle.type}/${bundle.id}/${name}`;

                  // relative path from context of the ENTRY_CREATOR, with linux path separators
                  let requirePath = Path.relative(newContext, absolute).split('\\').join('/');
                  if (!requirePath.startsWith('.')) {
                    // ensure requirePath is identified by node as relative
                    requirePath = `./${requirePath}`;
                  }

                  return { importId, requirePath };
                }),
              },
            },
          ],
        },
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
            ...worker.themeTags.map((theme) => ({
              resourceQuery: `?${theme}`,
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
                      path: require.resolve('@kbn/optimizer/postcss.config.js'),
                    },
                  },
                },
                {
                  loader: 'sass-loader',
                  options: {
                    prependData(loaderContext: webpack.loader.LoaderContext) {
                      return `@import ${stringifyRequest(
                        loaderContext,
                        Path.resolve(
                          worker.repoRoot,
                          `src/core/public/core_app/styles/_globals_${theme}.scss`
                        )
                      )};\n`;
                    },
                    webpackImporter: false,
                    implementation: require('node-sass'),
                    sassOptions: {
                      outputStyle: 'nested',
                      includePaths: [Path.resolve(worker.repoRoot, 'node_modules')],
                      sourceMapRoot: `/${bundle.type}:${bundle.id}`,
                    },
                  },
                },
              ],
            })),
            {
              loader: require.resolve('./theme_loader'),
              options: {
                bundleId: bundle.id,
                themeTags: worker.themeTags,
              },
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
              envName: worker.dist ? 'production' : 'development',
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
      mainFields: ['browser', 'main'],
      alias: {
        tinymath: require.resolve('tinymath/lib/tinymath.es5.js'),
        core_app_image_assets: Path.resolve(worker.repoRoot, 'src/core/public/core_app/images'),
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
    ],

    optimization: {
      minimizer: [
        new TerserPlugin({
          cache: false,
          sourceMap: false,
          extractComments: false,
          parallel: false,
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
