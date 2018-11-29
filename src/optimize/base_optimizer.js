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

import { writeFile } from 'fs';

import Boom from 'boom';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import webpack from 'webpack';
import Stats from 'webpack/lib/Stats';
import webpackMerge from 'webpack-merge';

import { defaults } from 'lodash';

import { IS_KIBANA_DISTRIBUTABLE, fromRoot } from '../utils';

import { PUBLIC_PATH_PLACEHOLDER } from './public_path_placeholder';

const POSTCSS_CONFIG_PATH = require.resolve('./postcss.config');
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');
const BABEL_EXCLUDE_RE = [
  /[\/\\](webpackShims|node_modules|bower_components)[\/\\]/,
];

export default class BaseOptimizer {
  constructor(opts) {
    this.uiBundles = opts.uiBundles;
    this.profile = opts.profile || false;

    switch (opts.sourceMaps) {
      case true:
        this.sourceMaps = 'source-map';
        break;

      case 'fast':
        this.sourceMaps = 'cheap-module-eval-source-map';
        break;

      default:
        this.sourceMaps = opts.sourceMaps || false;
        break;
    }

    this.unsafeCache = opts.unsafeCache || false;
    if (typeof this.unsafeCache === 'string') {
      this.unsafeCache = [
        new RegExp(this.unsafeCache.slice(1, -1))
      ];
    }
  }

  async initCompiler() {
    if (this.compiler) return this.compiler;

    const compilerConfig = this.getConfig();
    this.compiler = webpack(compilerConfig);

    this.compiler.plugin('done', stats => {
      if (!this.profile) return;

      const path = this.uiBundles.resolvePath('stats.json');
      const content = JSON.stringify(stats.toJson());
      writeFile(path, content, function (err) {
        if (err) throw err;
      });
    });

    return this.compiler;
  }

  getConfig() {
    function getStyleLoaders(preProcessors = [], postProcessors = []) {
      return ExtractTextPlugin.extract({
        fallback: {
          loader: 'style-loader'
        },
        use: [
          ...postProcessors,
          {
            loader: 'css-loader',
            options: {
              // importLoaders needs to know the number of loaders that follow this one,
              // so we add 1 (for the postcss-loader) to the length of the preProcessors
              // array that we merge into this array
              importLoaders: 1 + preProcessors.length,
            },
          },
          {
            loader: 'postcss-loader',
            options: {
              config: {
                path: POSTCSS_CONFIG_PATH,
              },
            },
          },
          ...preProcessors,
        ],
      });
    }

    const nodeModulesPath = fromRoot('node_modules');

    /**
     * Adds a cache loader if we're running in dev mode. The reason we're not adding
     * the cache-loader when running in production mode is that it creates cache
     * files in optimize/.cache that are not necessary for distributable versions
     * of Kibana and just make compressing and extracting it more difficult.
     */
    const maybeAddCacheLoader = (cacheName, loaders) => {
      if (IS_KIBANA_DISTRIBUTABLE) {
        return loaders;
      }

      return [
        {
          loader: 'cache-loader',
          options: {
            cacheDirectory: this.uiBundles.getCacheDirectory(cacheName)
          }
        },
        ...loaders
      ];
    };

    /**
     * Creates the selection rules for a loader that will only pass for
     * source files that are eligible for automatic transpilation.
     */
    const createSourceFileResourceSelector = (test) => {
      return [
        {
          test,
          exclude: BABEL_EXCLUDE_RE.concat(this.uiBundles.getWebpackNoParseRules()),
        },
        {
          test,
          include: /[\/\\]node_modules[\/\\]x-pack[\/\\]/,
          exclude: /[\/\\]node_modules[\/\\]x-pack[\/\\](.+?[\/\\])*node_modules[\/\\]/,
        }
      ];
    };

    const commonConfig = {
      node: { fs: 'empty' },
      context: fromRoot('.'),
      entry: this.uiBundles.toWebpackEntries(),

      devtool: this.sourceMaps,
      profile: this.profile || false,

      output: {
        path: this.uiBundles.getWorkingDir(),
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: PUBLIC_PATH_PLACEHOLDER,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      plugins: [
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        }),

        new webpack.optimize.CommonsChunkPlugin({
          name: 'commons',
          filename: 'commons.bundle.js',
          minChunks: 2,
        }),

        new webpack.optimize.CommonsChunkPlugin({
          name: 'vendors',
          filename: 'vendors.bundle.js',
          // only combine node_modules from Kibana
          minChunks: module => module.context && module.context.indexOf(nodeModulesPath) !== -1
        }),

        new webpack.NoEmitOnErrorsPlugin(),

        // replace imports for `uiExports/*` modules with a synthetic module
        // created by create_ui_exports_module.js
        new webpack.NormalModuleReplacementPlugin(/^uiExports\//, (resource) => {
          // the map of uiExport types to module ids
          const extensions = this.uiBundles.getAppExtensions();

          // everything following the first / in the request is
          // treated as a type of appExtension
          const type = resource.request.slice(resource.request.indexOf('/') + 1);

          resource.request = [
            // the "val-loader" is used to execute create_ui_exports_module
            // and use its return value as the source for the module in the
            // bundle. This allows us to bypass writing to the file system
            require.resolve('val-loader'),
            '!',
            require.resolve('./create_ui_exports_module'),
            '?',
            // this JSON is parsed by create_ui_exports_module and determines
            // what require() calls it will execute within the bundle
            JSON.stringify({ type, modules: extensions[type] || [] })
          ].join('');
        }),

        ...this.uiBundles.getWebpackPluginProviders()
          .map(provider => provider(webpack)),
      ],

      module: {
        rules: [
          {
            test: /\.less$/,
            use: getStyleLoaders(
              ['less-loader'],
              maybeAddCacheLoader('less', [])
            ),
          },
          {
            test: /\.css$/,
            use: getStyleLoaders(),
          },
          {
            test: /\.(html|tmpl)$/,
            loader: 'raw-loader'
          },
          {
            test: /\.png$/,
            loader: 'url-loader'
          },
          {
            test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/,
            loader: 'file-loader'
          },
          {
            resource: createSourceFileResourceSelector(/\.js$/),
            use: maybeAddCacheLoader('babel', [
              {
                loader: 'babel-loader',
                options: {
                  babelrc: false,
                  presets: [
                    BABEL_PRESET_PATH,
                  ],
                },
              }
            ]),
          },
          ...this.uiBundles.getPostLoaders().map(loader => ({
            enforce: 'post',
            ...loader
          })),
        ],
        noParse: this.uiBundles.getWebpackNoParseRules(),
      },

      resolve: {
        extensions: ['.js', '.json'],
        mainFields: ['browser', 'browserify', 'main'],
        modules: [
          'webpackShims',
          fromRoot('webpackShims'),

          'node_modules',
          fromRoot('node_modules'),
        ],
        alias: this.uiBundles.getAliases(),
        unsafeCache: this.unsafeCache,
      },
    };

    // when running from the distributable define an environment variable we can use
    // to exclude chunks of code, modules, etc.
    const isDistributableConfig = {
      plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            'IS_KIBANA_DISTRIBUTABLE': `"true"`
          }
        }),
      ]
    };

    // when running from source transpile TypeScript automatically
    const getSourceConfig = () => {
      // dev/typescript is deleted from the distributable, so only require it if we actually need the source config
      const { Project } = require('../dev/typescript');
      const browserProject = new Project(fromRoot('tsconfig.browser.json'));

      return {
        module: {
          rules: [
            {
              resource: createSourceFileResourceSelector(/\.tsx?$/),
              use: maybeAddCacheLoader('typescript', [
                {
                  loader: 'ts-loader',
                  options: {
                    transpileOnly: true,
                    experimentalWatchApi: true,
                    onlyCompileBundledFiles: true,
                    configFile: fromRoot('tsconfig.json'),
                    compilerOptions: {
                      ...browserProject.config.compilerOptions,
                      sourceMap: Boolean(this.sourceMaps),
                    }
                  }
                }
              ]),
            }
          ]
        },

        stats: {
          // when typescript doesn't do a full type check, as we have the ts-loader
          // configured here, it does not have enough information to determine
          // whether an imported name is a type or not, so when the name is then
          // exported, typescript has no choice but to emit the export. Fortunately,
          // the extraneous export should not be harmful, so we just suppress these warnings
          // https://github.com/TypeStrong/ts-loader#transpileonly-boolean-defaultfalse
          warningsFilter: /export .* was not found in/
        },

        resolve: {
          extensions: ['.ts', '.tsx'],
        },
      };
    };

    // We need to add react-addons (and a few other bits) for enzyme to work.
    // https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md
    const supportEnzymeConfig = {
      externals: {
        'mocha': 'mocha',
        'react/lib/ExecutionEnvironment': true,
        'react/addons': true,
        'react/lib/ReactContext': true,
      }
    };

    const watchingConfig = {
      plugins: [
        new webpack.WatchIgnorePlugin([
          // When our bundle entry files are fresh they cause webpack
          // to think they might have changed since the watcher was
          // initialized, which triggers a second compilation on startup.
          // Since we can't reliably update these files anyway, we can
          // just ignore them in the watcher and prevent the extra compilation
          /bundles[\/\\].+\.entry\.js/,
        ])
      ]
    };

    // in production we set the process.env.NODE_ENV and uglify our bundles
    const productionConfig = {
      plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            'NODE_ENV': '"production"'
          }
        }),
        new UglifyJsPlugin({
          parallel: true,
          sourceMap: false,
          uglifyOptions: {
            compress: {
              // the following is required for dead-code the removal
              // check in React DevTools

              unused: true,
              dead_code: true,
              conditionals: true,
              evaluate: true,

              comparisons: false,
              sequences: false,
              properties: false,
              drop_debugger: false,
              booleans: false,
              loops: false,
              toplevel: false,
              top_retain: false,
              hoist_funs: false,
              if_return: false,
              join_vars: false,
              collapse_vars: false,
              reduce_vars: false,
              warnings: false,
              negate_iife: false,
              keep_fnames: true,
              keep_infinity: true,
              side_effects: false
            },
            mangle: false
          }
        }),
      ]
    };

    return webpackMerge(
      commonConfig,
      IS_KIBANA_DISTRIBUTABLE
        ? isDistributableConfig
        : getSourceConfig(),
      this.uiBundles.isDevMode()
        ? webpackMerge(watchingConfig, supportEnzymeConfig)
        : productionConfig
    );
  }

  failedStatsToError(stats) {
    const details = stats.toString(defaults(
      { colors: true },
      Stats.presetToOptions('minimal')
    ));

    return Boom.internal(
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(Stats.presetToOptions('detailed'))
    );
  }
}
