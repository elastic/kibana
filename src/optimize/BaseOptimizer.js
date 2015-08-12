let { inherits } = require('util');
let { defaults } = require('lodash');
let { resolve } = require('path');
let { writeFile } = require('fs');
let webpack = require('webpack');
var Boom = require('boom');
let DirectoryNameAsMain = require('webpack-directory-name-as-main');
let ExtractTextPlugin = require('extract-text-webpack-plugin');
var CommonsChunkPlugin = require('webpack/lib/optimize/CommonsChunkPlugin');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
let babelOptions = require('./babelOptions');

class BaseOptimizer {
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

    let compilerConfig = this.getConfig();
    this.compiler = webpack(compilerConfig);

    this.compiler.plugin('done', stats => {
      if (!this.profile) return;

      let path = resolve(this.env.workingDir, 'stats.json');
      let content = JSON.stringify(stats.toJson());
      writeFile(path, content, function (err) {
        if (err) throw err;
      });
    });

    return this.compiler;
  }

  getConfig() {
    let mapQ = this.sourceMaps ? '?sourceMap' : '';

    return {
      context: fromRoot('.'),
      entry: this.bundles.toWebpackEntries(),

      devtool: this.sourceMaps,
      profile: this.profile || false,

      output: {
        path: this.env.workingDir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: '/bundles/',
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      recordsPath: resolve(this.env.workingDir, 'webpack.records'),

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.NoErrorsPlugin(),
        new webpack.optimize.DedupePlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        }),
        new CommonsChunkPlugin({
          name: 'commons',
          filename: 'commons.bundle.js'
        }),
      ],

      module: {
        loaders: [
          {
            test: /\.less$/,
            loader: ExtractTextPlugin.extract(
              'style',
              `css${mapQ}!autoprefixer?{ "browsers": ["last 2 versions","> 5%"] }!less${mapQ}`
            )
          },
          { test: /\.css$/, loader: ExtractTextPlugin.extract('style', `css${mapQ}`) },
          { test: /\.jade$/, loader: 'jade' },
          { test: /\.(html|tmpl)$/, loader: 'raw' },
          { test: /\.png$/, loader: 'url?limit=10000&name=[path][name].[ext]' },
          { test: /\.(woff|woff2|ttf|eot|svg|ico)(\?|$)/, loader: 'file?name=[path][name].[ext]' },
          { test: /[\/\\]src[\/\\](plugins|ui)[\/\\].+\.js$/, loader: `auto-preload-rjscommon-deps${mapQ}` },
          {
            test: /\.js$/,
            exclude: /[\/\\](node_modules|bower_components)[\/\\]/,
            loader: 'babel',
            query: babelOptions
          },
          {
            test: /\.jsx$/,
            exclude: /[\/\\](node_modules|bower_components)[\/\\]/,
            loader: 'babel',
            query: defaults({
              nonStandard: true
            }, babelOptions)
          }
        ].concat(this.env.loaders),
        noParse: this.env.noParse,
      },

      resolve: {
        extensions: ['.babel.js', '.js', '.less', ''],
        postfixes: [''],
        modulesDirectories: ['node_modules'],
        loaderPostfixes: ['-loader', ''],
        root: fromRoot('.'),
        alias: this.env.aliases,
        unsafeCache: this.unsafeCache,
      },
    };
  }

  failedStatsToError(stats) {
    let statFormatOpts = {
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

    let details = stats.toString(defaults({ colors: true }, statFormatOpts));

    return Boom.create(
      500,
      `Optimizations failure.\n${details.split('\n').join('\n    ')}\n`,
      stats.toJson(statFormatOpts)
    );
  }
}

module.exports = BaseOptimizer;
