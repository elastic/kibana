import { resolve } from 'path';
import { writeFile } from 'fs';

import Boom from 'boom';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import webpack from 'webpack';
import CommonsChunkPlugin from 'webpack/lib/optimize/CommonsChunkPlugin';
import DefinePlugin from 'webpack/lib/DefinePlugin';
import UglifyJsPlugin from 'webpack/lib/optimize/UglifyJsPlugin';
import NoEmitOnErrorsPlugin from 'webpack/lib/NoEmitOnErrorsPlugin';
import Stats from 'webpack/lib/Stats';
import webpackMerge from 'webpack-merge';

import { defaults } from 'lodash';

import { fromRoot } from '../utils';

import { PUBLIC_PATH_PLACEHOLDER } from './public_path_placeholder';

const POSTCSS_CONFIG_PATH = require.resolve('./postcss.config');
const BABEL_PRESET_PATH = require.resolve('../babel-preset/webpack');
const BABEL_EXCLUDE_RE = [
  /[\/\\](webpackShims|node_modules|bower_components)[\/\\]/,
];

export default class BaseOptimizer {
  constructor(opts) {
    this.env = opts.env;
    this.bundles = opts.bundles;
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

      const path = resolve(this.env.workingDir, 'stats.json');
      const content = JSON.stringify(stats.toJson());
      writeFile(path, content, function (err) {
        if (err) throw err;
      });
    });

    return this.compiler;
  }

  getConfig() {
    const cacheDirectory = resolve(this.env.workingDir, '../.cache', this.bundles.hashBundleEntries());

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

    const commonConfig = {
      node: { fs: 'empty' },
      context: fromRoot('.'),
      entry: this.bundles.toWebpackEntries(),

      devtool: this.sourceMaps,
      profile: this.profile || false,

      output: {
        path: this.env.workingDir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: PUBLIC_PATH_PLACEHOLDER,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      plugins: [
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        }),

        new CommonsChunkPlugin({
          name: 'commons',
          filename: 'commons.bundle.js'
        }),

        new NoEmitOnErrorsPlugin(),
      ],

      module: {
        rules: [
          {
            test: /\.less$/,
            use: getStyleLoaders(
              ['less-loader'],
              [{
                loader: 'cache-loader',
                options: {
                  cacheDirectory: resolve(cacheDirectory, 'less'),
                }
              }]
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
            test: /\.js$/,
            exclude: BABEL_EXCLUDE_RE.concat(this.env.noParse),
            use: [
              {
                loader: 'cache-loader',
                options: {
                  cacheDirectory: resolve(cacheDirectory, 'babel'),
                }
              },
              {
                loader: 'babel-loader',
                options: {
                  babelrc: false,
                  presets: [
                    BABEL_PRESET_PATH,
                  ],
                },
              },
            ],
          },
          ...this.env.postLoaders.map(loader => ({
            enforce: 'post',
            ...loader
          })),
        ],
        noParse: this.env.noParse,
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
        alias: this.env.aliases,
        unsafeCache: this.unsafeCache,
      },
    };

    if (this.env.context.env === 'development') {
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
        new DefinePlugin({
          'process.env': {
            'NODE_ENV': '"production"'
          }
        }),
        new UglifyJsPlugin({
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
