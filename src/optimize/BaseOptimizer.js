'use strict';

let EventEmitter = require('events').EventEmitter;
let inherits = require('util').inherits;
let _ = require('lodash');
let join = require('path').join;
let write = require('fs').writeFileSync;
let webpack = require('webpack');
let DirectoryNameAsMain = require('webpack-directory-name-as-main');
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let utils = require('requirefrom')('src/utils');
let fromRoot = utils('fromRoot');
let OptmzBundles = require('./OptmzBundles');
let OptmzUiModules = require('./OptmzUiModules');

let kbnTag = `Kibana ${ utils('packageJson').version }`;

class BaseOptimizer extends EventEmitter {
  constructor(opts) {
    super();

    this.sourceMaps = opts.sourceMaps || false;
    this.modules = new OptmzUiModules(opts.plugins);
    this.bundles = new OptmzBundles(
      opts,
      `${kbnTag} ${this.constructor.name} ${ this.sourceMaps ? ' (with source maps)' : ''}`
    );

    _.bindAll(this, 'getConfig');
  }

  getConfig() {
    let mapQ = this.sourceMaps ? '?sourceMap' : '';

    return {
      context: fromRoot('.'),
      entry: this.bundles.getEntriesConfig(),

      devtool: this.sourceMaps ? '#source-map' : false,

      output: {
        path: this.bundles.dir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: '/bundles/',
        devtoolModuleFilenameTemplate: '[absolute-resource-path]'
      },

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.NoErrorsPlugin(),
        new webpack.optimize.DedupePlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        })
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
          { test: /\/src\/(plugins|ui)\/.+\.js$/, loader: `auto-preload-rjscommon-deps${mapQ}` }
        ].concat(this.modules.loaders),
        noParse: this.modules.noParse,
      },

      resolve: {
        extensions: ['.js', '.less', ''],
        postfixes: [''],
        modulesDirectories: ['node_modules'],
        loaderPostfixes: ['-loader', ''],
        root: fromRoot('.'),
        alias: this.modules.aliases
      }
    };
  }
}

module.exports = BaseOptimizer;
