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
import os from 'os';
import Boom from 'boom';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import Stats from 'webpack/lib/Stats';
import webpackMerge from 'webpack-merge';
import UglifyJsPlugin from 'uglifyjs-webpack-plugin';
import { Compiler as DLLCompiler } from './dll_bundler';

import { defaults } from 'lodash';

import { IS_KIBANA_DISTRIBUTABLE, fromRoot, pkg } from '../utils';

import { PUBLIC_PATH_PLACEHOLDER } from './public_path_placeholder';

const POSTCSS_CONFIG_PATH = require.resolve('./postcss.config');
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack_preset');
const BABEL_EXCLUDE_RE = [
  /[\/\\](webpackShims|node_modules|bower_components)[\/\\]/,
];
const STATS_WARNINGS_FILTER = /export .* was not found in/;

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

  areCompilersReady() {
    return this.compiler && this.dllCompiler;
  }

  async init() {
    if (this.areCompilersReady()) return this;

    const dllCompilerConfig = this.getDLLConfig();
    this.dllCompiler = new DLLCompiler(dllCompilerConfig);

    const compilerConfig = this.getConfig();
    this.compiler = webpack(compilerConfig);

    this.compiler.hooks.done.tap({
      name: 'kibana-writeStatsJson',
      fn: stats => {
        if (!this.profile) {
          return;
        }

        const path = this.uiBundles.resolvePath('stats.json');
        const content = JSON.stringify(stats.toJson());
        writeFile(path, content, function (err) {
          if (err) throw err;
        });
      }
    });

    return this;
  }

  getDLLConfig() {
    const dependencies = Object.keys(pkg.dependencies);

    const dllBundles = [
      {
        dllEntries: [
          {
            name: 'vendor',
            /*include: [
              'x-pack',
              'angular',
              'angular-elastic',
              'd3',
              'd3-cloud',
              'elasticsearch-browser',
              'jquery',
              'moment',
              'moment-timezone',
              'ngreact',
              'react',
              'react-addons-shallow-compare',
              'react-anything-sortable',
              'react-color',
              'react-dom',
              'react-grid-layout',
              'react-input-range',
              'react-markdown',
              'react-redux',
              'react-router-dom',
              'react-sizeme',
              'react-toggle',
              'reactcss',
              'redux',
              'redux-actions',
              'redux-thunk',
              'rxjs',
              'uuid',
              'vega-lib',
              'vega-lite',
              'vega-schema-url-parser',
              'vega-tooltip',
              'yauzl'
            ],
            exclude: [],*/
            include: dependencies,
            exclude: [],
            /*exclude: [
              'JSONStream',
              'tinygradient',
              'mini-css-extract-plugin',
              'x-pack',
              'webpack',
              '@kbn/pm',
              '@kbn/babel-preset',
              '@kbn/ui-framework',
              '@kbn/datemath',
              'font-awesome',
              'handlebars',
              '@kbn/babel-preset',
              'babel-loader',
              'babel-core',
              'babel-polyfill',
              'babel-register',
              'body-parser',
              'vision',
              'uglifyjs-webpack-plugin',
              'postcss-loader',
              'even-better',
              'jade',
              'jade-loader',
              '@kbn/es',
              'prop-types',
              'node-fetch',
              'fetch-mock',
              'autoprefixer',
              'css-loader',
              'less',
              'less-loader',
              '@elastic/eui',
              '@elastic/filesaver',
              '@elastic/numeral',
              '@elastic/ui-ace',
              '@kbn/babel-preset',
              '@kbn/i18n',
              '@kbn/test-subj-selector',
              'bunyan',
              'url-loader'
            ]*/
          },
        ]
      }
    ];

    return {
      dllBundles,
      options: {
        context: fromRoot('.'),
        isProduction: IS_KIBANA_DISTRIBUTABLE,
        outputPath: this.uiBundles.getWorkingDir(),
        publicPath: PUBLIC_PATH_PLACEHOLDER,
        mergeConfig: {
          node: { fs: 'empty', child_process: 'empty', dns: 'empty', net: 'empty', tls: 'empty' },
          resolve: {
            extensions: ['.js', '.json'],
            mainFields: ['browser', 'browserify', 'main']
          }
        }
      }
    };
  }

  getConfig() {
    function getStyleLoaderExtractor() {
      return [
        MiniCssExtractPlugin.loader
      ];
    }

    function getStyleLoaders(preProcessors = [], postProcessors = []) {
      return [
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
      ];
    }

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
          exclude: /[\/\\]node_modules[\/\\]x-pack[\/\\]node_modules[\/\\]/,
        }
      ];
    };

    const commonConfig = {
      mode: 'development',
      node: { fs: 'empty' },
      context: fromRoot('.'),
      parallelism: os.cpus().length - 1,
      cache: !!this.unsafeCache,
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

      optimization: {
        splitChunks: {
          cacheGroups: {
            /*vendors: {
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              minSize: 0,
              minChunks: 1,
              maxInitialRequests: Infinity,
              maxAsyncRequests: Infinity,
            },*/
            commons: {
              name: 'commons',
              chunks: 'initial',
              minChunks: 2,
              reuseExistingChunk: true,
            }
          }
        },
        noEmitOnErrors: true
      },

      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].style.css',
        }),

        new webpack.DllReferencePlugin({
          context: fromRoot('.'),
          manifest: require(`${this.uiBundles.getWorkingDir()}/dlls/vendor.json`)
        }),

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
            use: [
              ...getStyleLoaderExtractor(),
              ...getStyleLoaders(['less-loader'], maybeAddCacheLoader('less', []))
            ],
          },
          {
            test: /\.css$/,
            use: [
              ...getStyleLoaderExtractor(),
              ...getStyleLoaders([], maybeAddCacheLoader('css', []))
            ],
          },
          {
            // TODO: this doesn't seem to be used, remove?
            test: /\.jade$/,
            loader: 'jade-loader'
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
        alias: this.uiBundles.getAliases()
      },
    };

    // we transpile typescript in the optimizer unless we are running the distributable
    const transpileTsConfig = {
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
                  compilerOptions: {
                    sourceMap: Boolean(this.sourceMaps),
                    target: 'es5',
                    module: 'esnext',
                  }
                }
              }
            ]),
          }
        ]
      },

      resolve: {
        extensions: ['.ts', '.tsx'],
      },
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
      mode: 'production',
      optimization: {
        minimize: true,
        minimizer: [
          new UglifyJsPlugin({
            uglifyOptions: {
              compress: {
                warnings: false
              },
              sourceMap: false,
              mangle: false
            },
            parallel: true
          })
        ]
      }
    };

    return webpackMerge(
      commonConfig,
      IS_KIBANA_DISTRIBUTABLE
        ? {}
        : transpileTsConfig,
      this.uiBundles.isDevMode()
        ? webpackMerge(watchingConfig, supportEnzymeConfig)
        : productionConfig
    );
  }

  isFailure(stats) {
    if (stats.hasErrors()) {
      return true;
    }

    const { warnings } = stats.toJson({ all: false, warnings: true });

    // when typescript doesn't do a full type check, as we have the ts-loader
    // configured here, it does not have enough information to determine
    // whether an imported name is a type or not, so when the name is then
    // exported, typescript has no choice but to emit the export. Fortunately,
    // the extraneous export should not be harmful, so we just suppress these warnings
    // https://github.com/TypeStrong/ts-loader#transpileonly-boolean-defaultfalse
    const filteredWarnings = Stats.filterWarnings(warnings, STATS_WARNINGS_FILTER);

    return filteredWarnings.length > 0;
  }

  failedStatsToError(stats) {
    const details = stats.toString(defaults(
      { colors: true, warningsFilter: STATS_WARNINGS_FILTER },
      Stats.presetToOptions('minimal')
    ));

    return Boom.create(
      500,
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(defaults({
        warningsFilter: STATS_WARNINGS_FILTER,
        ...Stats.presetToOptions('detailed')
      }))
    );
  }

  async run(...args) {
    await this.dllCompiler.run();
    await this.compiler.run(args);
  }
}
