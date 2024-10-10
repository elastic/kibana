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

import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import { merge as webpackMerge } from 'webpack-merge';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import UiSharedDepsNpm from '@kbn/ui-shared-deps-npm';
import * as UiSharedDepsSrc from '@kbn/ui-shared-deps-src';
import StatoscopeWebpackPlugin from '@statoscope/webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import {
  STATS_WARNINGS_FILTER,
  STATS_OPTIONS_DEFAULT_USEFUL_FILTER,
} from '@kbn/optimizer-webpack-helpers';
import { NodeLibsBrowserPlugin } from '@kbn/node-libs-browser-webpack-plugin';

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
    context: bundle.contextDir,
    entry: {
      [bundle.id]: ENTRY_CREATOR,
    },

    devtool: worker.dist ? false : 'cheap-source-map',
    profile: worker.profileWebpack,

    target: 'web',

    output: {
      // TODO: remove this commented line if xxhash64 is faster
      // hashFunction: 'sha1',
      path: bundle.outputDir,
      filename: `${bundle.id}.${bundle.type}.js`,
      chunkFilename: `${bundle.id}.chunk.[id].js`,
      devtoolModuleFilenameTemplate: (info: any) =>
        `/${bundle.type}:${bundle.id}/${Path.relative(
          bundle.sourceRoot,
          info.absoluteResourcePath
        )}${info.query}`,
      chunkLoadingGlobal: `${bundle.id}_bundle_jsonpfunction`,
      chunkLoading: 'jsonp',
    },

    optimization: {
      moduleIds: worker.dist ? 'deterministic' : 'natural',
      chunkIds: worker.dist ? 'deterministic' : 'natural',
      emitOnErrors: false,
      splitChunks: {
        maxAsyncRequests: 10,
        cacheGroups: {
          default: {
            reuseExistingChunk: false,
          },
        },
      },
    },

    externals: {
      'node:crypto': 'commonjs crypto',
      ...UiSharedDepsSrc.externals,
    },

    plugins: [
      new NodeLibsBrowserPlugin(),
      new CleanWebpackPlugin(),
      new BundleRemotesPlugin(bundle, bundleRemotes),
      new PopulateBundleCachePlugin(worker, bundle, parseDllManifest(DLL_MANIFEST)),
      new BundleMetricsPlugin(bundle),
      new webpack.DllReferencePlugin({
        context: worker.repoRoot,
        manifest: DLL_MANIFEST,
      }),
      ...(worker.profileWebpack
        ? [
            new EmitStatsPlugin(bundle),
            new BundleAnalyzerPlugin({
              analyzerMode: 'static',
              reportFilename: `${bundle.id}.analyzer.html`,
              openAnalyzer: false,
              logLevel: 'silent',
            }),
            new StatoscopeWebpackPlugin({
              open: false,
              saveReportTo: `${bundle.outputDir}/${bundle.id}.statoscope.html`,
              statsOptions: STATS_OPTIONS_DEFAULT_USEFUL_FILTER,
            }),
          ]
        : []),
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
          resourceQuery: { not: /raw/ },
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
                    additionalData(content: string, loaderContext: webpack.LoaderContext<any>) {
                      const req = JSON.stringify(
                        loaderContext.utils.contextify(
                          loaderContext.context || loaderContext.rootContext,
                          Path.resolve(
                            worker.repoRoot,
                            `src/core/public/styles/core_app/_globals_${theme}.scss`
                          )
                        )
                      );
                      return `@import ${req};\n${content}`;
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
          test: /\.(js|tsx?)$/,
          resourceQuery: { not: /raw/ },
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
          test: /\.peggy$/,
          loader: require.resolve('@kbn/peggy-loader'),
        },
        // emits a separate file and exports the URL. Previously achievable by using file-loader.
        {
          include: [
            require.resolve('@mapbox/mapbox-gl-rtl-text/mapbox-gl-rtl-text.min.js'),
            require.resolve('maplibre-gl/dist/maplibre-gl-csp-worker'),
          ],
          type: 'asset/resource',
        },
        // exports the source code of the asset. Previously achievable by using raw-loader.
        {
          resourceQuery: /raw/,
          type: 'asset/source',
        },
        {
          test: /\.(html|md|txt|tmpl)$/,
          type: 'asset/source',
        },
        // automatically chooses between exporting a data URI and emitting a separate file. Previously achievable by using url-loader with asset size limit.
        {
          test: /\.(woff|woff2|ttf|eot|svg|ico|png|jpg|gif|jpeg)(\?|$)/,
          type: 'asset',
          parser: {
            dataUrlCondition: {
              maxSize: 8192,
            },
          },
        },
      ],
    },

    resolve: {
      extensions: ['.js', '.ts', '.tsx', '.json'],
      mainFields: ['browser', 'module', 'main'],
      // conditionNames: ['browser', 'module', 'import', 'require', 'default'],
      //
      // mainFields: ['browser', 'main', 'module'],
      // // conditionNames: ['require', 'node', 'module', 'import', 'default'],
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

    ignoreWarnings: [STATS_WARNINGS_FILTER],
  };

  const nonDistributableConfig: webpack.Configuration = {
    mode: 'development',

    // TODO: potential performance impact flags
    cache: {
      type: 'memory',
      cacheUnaffected: true,
    },

    output: {
      // xxhash64 or sha1: according to docs xxhash should be faster but for now sha1 looks faster
      hashFunction: 'xxhash64',
      // Setting this to false looks like it will boost performance by a little
      // pathinfo: false,
    },

    experiments: {
      cacheUnaffected: true,
      // TODO: enable this after converting all plugins to v5
      backCompat: false,
    },

    optimization: {
      // Need to test which composition makes for the best performance
      sideEffects: false,
      // providedExports: false,
      // usedExports: false,
      removeAvailableModules: false,
      removeEmptyChunks: false,
      // mergeDuplicateChunks: false,
    },

    // resolve: {
    //  // Not sure if this is bringing any performance to the table
    //  cacheWithContext: false,
    // },

    module: {
      // This was default on webpack v4
      unsafeCache: true,
    },
    // NOTE: I'm not sure about this, but it does seem like it is speeding up
    // parallelism: 5000,
    //
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
          extractComments: false,
          parallel: false,
          terserOptions: {
            compress: { passes: 2 },
            keep_classnames: true,
            mangle: true,
          },
        }),
      ],
      // TODO: try to understand why usedExports is treeShaking code it shouldn't be
      usedExports: false,
      // sideEffects: false,
      //
    },
  };

  return webpackMerge(commonConfig, worker.dist ? distributableConfig : nonDistributableConfig);
}
