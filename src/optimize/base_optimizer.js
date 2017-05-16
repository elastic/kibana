import { resolve } from 'path';
import { writeFile } from 'fs';

import webpack from 'webpack';
import Boom from 'boom';
import DirectoryNameAsMain from '@elastic/webpack-directory-name-as-main';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import CommonsChunkPlugin from 'webpack/lib/optimize/CommonsChunkPlugin';
import DefinePlugin from 'webpack/lib/DefinePlugin';
import UglifyJsPlugin from 'webpack/lib/optimize/UglifyJsPlugin';
import { defaults, transform } from 'lodash';

import { fromRoot } from '../utils';
import babelOptions from './babel/options';
import pkg from '../../package.json';
import { setLoaderQueryParam, makeLoaderString } from './loaders';

const babelExclude = [/[\/\\](webpackShims|node_modules|bower_components)[\/\\]/];

class BaseOptimizer {
  constructor(opts) {
    this.env = opts.env;
    this.urlBasePath = opts.urlBasePath;
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
    const loaderWithSourceMaps = (loader) =>
      setLoaderQueryParam(loader, 'sourceMap', !!this.sourceMaps);

    const makeStyleLoader = preprocessor => {
      let loaders = [
        loaderWithSourceMaps('css-loader?autoprefixer=false'),
        {
          name: 'postcss-loader',
          query: {
            config: require.resolve('./postcss.config')
          }
        },
      ];

      if (preprocessor) {
        loaders = [
          ...loaders,
          loaderWithSourceMaps(preprocessor)
        ];
      }

      return ExtractTextPlugin.extract(makeLoaderString(loaders));
    };

    const config = {
      node: { fs: 'empty' },
      context: fromRoot('.'),
      entry: this.bundles.toWebpackEntries(),

      devtool: this.sourceMaps,
      profile: this.profile || false,

      output: {
        path: this.env.workingDir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: `${this.urlBasePath || ''}/bundles/`,
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      recordsPath: resolve(this.env.workingDir, 'webpack.records'),

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.NoErrorsPlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        }),
        new CommonsChunkPlugin({
          name: 'commons',
          filename: 'commons.bundle.js'
        }),
        ...this.pluginsForEnv(this.env.context.env)
      ],

      module: {
        loaders: [
          { test: /\.less$/, loader: makeStyleLoader('less-loader') },
          { test: /\.css$/, loader: makeStyleLoader() },
          { test: /\.jade$/, loader: 'jade-loader' },
          { test: /\.json$/, loader: 'json-loader' },
          { test: /\.(html|tmpl)$/, loader: 'raw-loader' },
          { test: /\.png$/, loader: 'url-loader' },
          { test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/, loader: 'file-loader' },
          { test: /[\/\\]src[\/\\](core_plugins|ui)[\/\\].+\.js$/, loader: loaderWithSourceMaps('rjs-repack-loader') },
          {
            test: /\.jsx?$/,
            exclude: babelExclude.concat(this.env.noParse),
            loader: 'babel-loader',
            query: babelOptions.webpack
          },
        ],
        postLoaders: this.env.postLoaders || [],
        noParse: this.env.noParse,
      },

      resolve: {
        extensions: ['.js', '.json', '.jsx', '.less', ''],
        postfixes: [''],
        modulesDirectories: ['webpackShims', 'node_modules'],
        fallback: [fromRoot('webpackShims'), fromRoot('node_modules')],
        loaderPostfixes: ['-loader', ''],
        root: fromRoot('.'),
        alias: this.env.aliases,
        unsafeCache: this.unsafeCache,
      },

      resolveLoader: {
        alias: transform(pkg.dependencies, function (aliases, version, name) {
          if (name.endsWith('-loader')) {
            aliases[name] = require.resolve(name);
          }
        }, {})
      }
    };

    // In the test env we need to add react-addons (and a few other bits) for the
    // enzyme tests to work.
    // https://github.com/airbnb/enzyme/blob/master/docs/guides/webpack.md
    if (this.env.context.env === 'development') {
      config.externals = {
        'react/lib/ExecutionEnvironment': true,
        'react/addons': true,
        'react/lib/ReactContext': true,
      };
    }

    return config;
  }

  pluginsForEnv(env) {
    if (env !== 'production') {
      return [];
    }

    return [
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
    ];
  }

  failedStatsToError(stats) {
    const statFormatOpts = {
      hash: false,  // add the hash of the compilation
      version: false,  // add webpack version information
      timings: false,  // add timing information
      assets: false,  // add assets information
      chunks: false,  // add chunk information
      chunkModules: false,  // add built modules information to chunk information
      modules: false,  // add built modules information
      cached: false,  // add also information about cached (not built) modules
      reasons: false,  // add information about the reasons why modules are included
      source: false,  // add the source code of modules
      errorDetails: false,  // add details to errors (like resolving log)
      chunkOrigins: false,  // add the origins of chunks and chunk merging info
      modulesSort: false,  // (string) sort the modules by that field
      chunksSort: false,  // (string) sort the chunks by that field
      assetsSort: false,  // (string) sort the assets by that field
      children: false,
    };

    const details = stats.toString(defaults({ colors: true }, statFormatOpts));

    return Boom.create(
      500,
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(statFormatOpts)
    );
  }
}

module.exports = BaseOptimizer;
