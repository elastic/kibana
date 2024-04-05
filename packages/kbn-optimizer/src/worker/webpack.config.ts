/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Path from 'path';
import Fs from 'fs';

import { stringifyRequest } from 'loader-utils';
import webpack from 'webpack';
// @ts-expect-error
import TerserPlugin from 'terser-webpack-plugin';
import webpackMerge from 'webpack-merge';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import StatoscopeWebpackPlugin from '@statoscope/webpack-plugin';
// @ts-expect-error
import VisualizerPlugin from 'webpack-visualizer-plugin2';

import { Bundle, BundleRemotes, WorkerConfig, parseDllManifest } from '../common';
import { BundleRemotesPlugin } from './bundle_remotes_plugin';
import { BundleMetricsPlugin } from './bundle_metrics_plugin';
import { EmitStatsPlugin } from './emit_stats_plugin';
import { PopulateBundleCachePlugin } from './populate_bundle_cache_plugin';

const BABEL_PRESET = require.resolve('@kbn/babel-preset/webpack_preset');
const DLL_MANIFEST = JSON.parse(Fs.readFileSync(UiSharedDepsNpm.dllManifestPath, 'utf8'));

export function getWebpackConfig(
  bundle: Bundle,
  bundleRemotes: BundleRemotes,
  worker: WorkerConfig
) {
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

    externals: UiSharedDepsSrc.externals,

    plugins: [
      new CleanWebpackPlugin(),
      new BundleRemotesPlugin(bundle, bundleRemotes),
      new PopulateBundleCachePlugin(worker, bundle, parseDllManifest(DLL_MANIFEST)),
      new BundleMetricsPlugin(bundle),
      new webpack.DllReferencePlugin({
        context: worker.repoRoot,
        manifest: DLL_MANIFEST,
      }),
      // @ts-ignore something is wrong with the StatoscopeWebpackPlugin type.
      ...(worker.profileWebpack
        ? [
            new EmitStatsPlugin(bundle),
            new StatoscopeWebpackPlugin({
              open: false,
              saveReportTo: `${bundle.outputDir}/${bundle.id}.statoscope.html`,
            }),
            new VisualizerPlugin({ filename: `${bundle.id}.visualizer.html` }),
          ]
        : []),
      // @ts-ignore something is wrong with the StatoscopeWebpackPlugin type.
      ...(bundle.banner ? [new webpack.BannerPlugin({ banner: bundle.banner, raw: true })] : []),
    ],

    module: {
      // no parse rules for a few known large packages which have no require() statements
      // or which have require() statements that should be ignored because the file is
      // already bundled with all its necessary dependencies
      noParse: [
        /[\/\\]node_modules[\/\\]lodash[\/\\]index\.js$/,
        /[\/\\]node_modules[\/\\]vega[\/\\]build-es5[\/\\]vega\.js$/,
      ],

      rules: [
        {
          include: [ENTRY_CREATOR],
          use: [
            {
              loader: UiSharedDepsNpm.publicPathLoader,
              options: {
                key: bundle.id,
              },
            },
            {
              loader: require.resolve('val-loader'),
              options: {
                entries: bundle.remoteInfo.targets.map((target) => {
                  const absolute = Path.resolve(bundle.contextDir, target);
                  const newContext = Path.dirname(ENTRY_CREATOR);
                  const importId = `${bundle.type}/${bundle.id}/${target}`;

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
            {
              loader: 'postcss-loader',
              options: {
                sourceMap: !worker.dist,
                postcssOptions: {
                  config: require.resolve('../../postcss.config.js'),
                },
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
                    postcssOptions: {
                      config: require.resolve('../../postcss.config.js'),
                    },
                  },
                },
                {
                  loader: 'sass-loader',
                  options: {
                    additionalData(content: string, loaderContext: webpack.loader.LoaderContext) {
                      return `@import ${stringifyRequest(
                        loaderContext,
                        Path.resolve(
                          worker.repoRoot,
                          `src/core/public/styles/core_app/_globals_${theme}.scss`
                        )
                      )};\n${content}`;
                    },
                    implementation: require('sass-embedded'),
                    sassOptions: {
                      outputStyle: worker.dist ? 'compressed' : 'expanded',
                      includePaths: [Path.resolve(worker.repoRoot, 'node_modules')],
                      sourceMap: true,
                      quietDeps: true,
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
              presets: [BABEL_PRESET],
            },
          },
        },
        {
          test: /\.(html|md|txt|tmpl)$/,
          use: {
            loader: 'raw-loader',
          },
        },
        {
          test: /\.peggy$/,
          loader: require.resolve('@kbn/peggy-loader'),
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json'],
      mainFields: ['browser', 'main'],
      alias: {
        core_app_image_assets: Path.resolve(
          worker.repoRoot,
          'src/core/public/styles/core_app/images'
        ),
        vega: Path.resolve(worker.repoRoot, 'node_modules/vega/build-es5/vega.js'),
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
          parallel: false,
          terserOptions: {
            compress: { passes: 2 },
            keep_classnames: true,
            mangle: true,
          },
        }),
      ],
    },
  };

  return webpackMerge(commonConfig, worker.dist ? distributableConfig : nonDistributableConfig);
}
