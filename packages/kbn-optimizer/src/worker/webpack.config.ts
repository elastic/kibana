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

import normalizePath from 'normalize-path';
import { stringifyRequest } from 'loader-utils';
import webpack from 'webpack';
// @ts-ignore
import TerserPlugin from 'terser-webpack-plugin';
// @ts-ignore
import webpackMerge from 'webpack-merge';
// @ts-ignore
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import CompressionPlugin from 'compression-webpack-plugin';
import * as UiSharedDeps from '@kbn/ui-shared-deps';

import { Bundle, WorkerConfig, parseDirPath, DisallowedSyntaxPlugin } from '../common';

const IS_CODE_COVERAGE = !!process.env.CODE_COVERAGE;
const ISTANBUL_PRESET_PATH = require.resolve('@kbn/babel-preset/istanbul_preset');
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');

const STATIC_BUNDLE_PLUGINS = [
  { id: 'data', dirname: 'data' },
  { id: 'kibanaReact', dirname: 'kibana_react' },
  { id: 'kibanaUtils', dirname: 'kibana_utils' },
  { id: 'esUiShared', dirname: 'es_ui_shared' },
];

/**
 * Determine externals statements for require/import statements by looking
 * for requests resolving to the primary public export of the data, kibanaReact,
 * amd kibanaUtils plugins. If this module is being imported then rewrite
 * the import to access the global `__kbnBundles__` variables and access
 * the relavent properties from that global object.
 *
 * @param bundle
 * @param context the directory containing the module which made `request`
 * @param request the request for a module from a commonjs require() call or import statement
 */
function dynamicExternals(bundle: Bundle, context: string, request: string) {
  // ignore imports that have loaders defined
  if (request.includes('!')) {
    return;
  }

  // ignore requests that don't include a /{dirname}/public for one of our
  // "static" bundles as a cheap way to avoid doing path resolution
  // for paths that couldn't possibly resolve to what we're looking for
  const reqToStaticBundle = STATIC_BUNDLE_PLUGINS.some(p =>
    request.includes(`/${p.dirname}/public`)
  );
  if (!reqToStaticBundle) {
    return;
  }

  // determine the most acurate resolution string we can without running full resolution
  const rootRelative = normalizePath(
    Path.relative(bundle.sourceRoot, Path.resolve(context, request))
  );
  for (const { id, dirname } of STATIC_BUNDLE_PLUGINS) {
    if (rootRelative === `src/plugins/${dirname}/public`) {
      return `__kbnBundles__['plugin/${id}']`;
    }
  }

  // import doesn't match a root public import
  return undefined;
}

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
      filename: `[name].${bundle.type}.js`,
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
          }
        : {}),
    },

    optimization: {
      noEmitOnErrors: true,
    },

    externals: [
      UiSharedDeps.externals,
      function(context, request, cb) {
        try {
          cb(undefined, dynamicExternals(bundle, context, request));
        } catch (error) {
          cb(error, undefined);
        }
      },
    ],

    plugins: [new CleanWebpackPlugin(), new DisallowedSyntaxPlugin()],

    module: {
      // no parse rules for a few known large packages which have no require() statements
      // or which have require() statements that should be ignored because the file is
      // already bundled with all its necessary depedencies
      noParse: [
        /[\///]node_modules[\///]elasticsearch-browser[\///]/,
        /[\///]node_modules[\///]lodash[\///]index\.js$/,
        /[\///]node_modules[\///]vega-lib[\///]build[\///]vega\.js$/,
      ],

      rules: [
        {
          include: Path.join(bundle.contextDir, bundle.entry),
          loader: UiSharedDeps.publicPathLoader,
          options: {
            key: bundle.id,
          },
          sideEffects: true,
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
          sideEffects: true,
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
                      // apply only to legacy platform styles
                      if (!base || !parseDirPath(base).dirs.includes('legacy')) {
                        return null;
                      }

                      if (uri.startsWith('ui/assets')) {
                        return Path.resolve(
                          worker.repoRoot,
                          'src/core/server/core_app/',
                          uri.replace('ui/', '')
                        );
                      }

                      // manually force ui/* urls in legacy styles to resolve to ui/legacy/public
                      if (uri.startsWith('ui/')) {
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
                    // must always be enabled as long as we're using the `resolve-url-loader` to
                    // rewrite `ui/*` urls. They're dropped by subsequent loaders though
                    sourceMap: true,
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
          sideEffects: true,
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
      mainFields: ['browser', 'main'],
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
      new TerserPlugin({
        cache: false,
        sourceMap: false,
        extractComments: false,
        parallel: false,
        terserOptions: {
          compress: true,
          mangle: false,
        },
      }),
      new CompressionPlugin({
        algorithm: 'brotliCompress',
        filename: '[path].br',
        test: /\.(js|css)$/,
      }),
      new CompressionPlugin({
        algorithm: 'gzip',
        filename: '[path].gz',
        test: /\.(js|css)$/,
      }),
    ],
    optimization: {
      usedExports: true,

      // NODE: this is the default with `mode: production` and results in
      // less than ideal module name reporting
      concatenateModules: true,
    },
  };

  return webpackMerge(commonConfig, worker.dist ? distributableConfig : nonDistributableConfig);
}
