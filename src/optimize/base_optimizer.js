import { writeFile } from 'fs';

import Boom from 'boom';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import webpack from 'webpack';
import Stats from 'webpack/lib/Stats';
import webpackMerge from 'webpack-merge';

import { defaults } from 'lodash';

import { fromRoot } from '../utils';

import { PUBLIC_PATH_PLACEHOLDER } from './public_path_placeholder';

const POSTCSS_CONFIG_PATH = require.resolve('./postcss.config');
const BABEL_PRESET_PATH = require.resolve('@kbn/babel-preset/webpack');
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

    this.compiler.hooks.done.tap({
      name: 'kibana-writeStatsJson',
      fn: stats => {
        if (!this.profile) return;

        const path = this.uiBundles.resolvePath('stats.json');
        const content = JSON.stringify(stats.toJson());
        writeFile(path, content, function (err) {
          if (err) throw err;
        });
      }
    });

    return this.compiler;
  }

  getConfig() {
    function getStyleLoaders(preProcessors = [], postProcessors = []) {
      return [
        MiniCssExtractPlugin.loader,
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
    function maybeAddCacheLoader(uiBundles, cacheName, loaders) {
      if (!uiBundles.isDevMode()) {
        return loaders;
      }

      return [
        {
          loader: 'cache-loader',
          options: {
            cacheDirectory: uiBundles.getCacheDirectory(cacheName)
          }
        },
        ...loaders
      ];
    }

    const commonConfig = {
      mode: 'none',

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

      optimization: {
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            vendors: {
              name: 'vendors',
              test: /[\\/]node_modules[\\/]/,
              priority: -10,
              minSize: 0,
              minChunks: 1,
              maxInitialRequests: Infinity,
              maxAsyncRequests: Infinity,
            },
            commons: {
              name: 'commons',
              priority: -20,
              minChunks: 2,
              reuseExistingChunk: true,
            }
          }
        }
      },

      plugins: [
        new MiniCssExtractPlugin({
          filename: '[name].style.css',
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
              maybeAddCacheLoader(this.uiBundles, 'less', [])
            ),
          },
          {
            test: /\.css$/,
            use: getStyleLoaders(),
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
            resource: [
              {
                test: /\.js$/,
                exclude: BABEL_EXCLUDE_RE.concat(this.uiBundles.getWebpackNoParseRules()),
              },
              {
                test: /\.js$/,
                include: /[\/\\]node_modules[\/\\]x-pack[\/\\]/,
                exclude: /[\/\\]node_modules[\/\\]x-pack[\/\\]node_modules[\/\\]/,
              }
            ],
            use: maybeAddCacheLoader(this.uiBundles, 'babel', [
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

    if (this.uiBundles.isDevMode()) {
      return webpackMerge(commonConfig, {
        // In the test env we need to add react-addons (and a few other bits) for the
        // enzyme tests to work.
        // https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md
        externals: {
          'mocha': 'mocha',
          'react/lib/ExecutionEnvironment': true,
          'react/addons': true,
          'react/lib/ReactContext': true,
        }
      });
    }

    return webpackMerge(commonConfig, {
      plugins: [
        new webpack.DefinePlugin({
          'process.env': {
            'NODE_ENV': '"production"'
          }
        }),
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: false
          },
          sourceMap: false,
          mangle: false
        }),
      ]
    });
  }

  failedStatsToError(stats) {
    const details = stats.toString(defaults(
      { colors: true },
      Stats.presetToOptions('minimal')
    ));

    return Boom.create(
      500,
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(Stats.presetToOptions('detailed'))
    );
  }
}
