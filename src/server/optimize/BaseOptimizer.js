'use strict';

let EventEmitter = require('events').EventEmitter;
let inherits = require('util').inherits;
let _ = require('lodash');
let join = require('path').join;
let write = require('fs').writeFileSync;
let webpack = require('webpack');
let DirectoryNameAsMain = require('webpack-directory-name-as-main');
let ExtractTextPlugin = require('extract-text-webpack-plugin');

let assets = require('../ui/assets');
let fromRoot = require('../../utils/fromRoot');
let OptmzBundles = require('./OptmzBundles');
let OptmzUiModules = require('./OptmzUiModules');

let kbnTag = `Kibana ${ require('../../utils/closestPackageJson').getSync().version }`;

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
    return {
      context: fromRoot('.'),
      entry: this.bundles.getEntriesConfig(),

      devtool: this.sourceMaps ? '#source-map' : false,

      output: {
        path: this.bundles.dir,
        filename: '[name].bundle.js',
        sourceMapFilename: '[file].map',
        publicPath: '/bundles/',
        devtoolModuleFilenameTemplate: '[resource-path]'
      },

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsMain()
        ]),
        new webpack.optimize.DedupePlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        })
      ],

      module: {
        loaders: [
          { test: /\.less$/, loader: ExtractTextPlugin.extract('style', 'css?sourceMap!less?sourceMap') },
          { test: /\.css$/, loader: ExtractTextPlugin.extract('style', 'css?sourceMap') },
          { test: /\.jade$/, loader: 'jade' },
          { test: /\.(html|tmpl)$/, loader: 'raw' },
          { test: /\.png$/, loader: 'url?limit=2048!file?name=[path][name].[ext]' },
          { test: /\.(woff|woff2|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=[path][name].[ext]' },
          { test: /\/src\/(plugins|ui)\/.+\.js$/, loader: 'auto-preload-rjscommon-deps' },
          { test: /\/__tests__\//, loader: 'mocha' }
        ].concat(this.modules.loaders),
        noParse: this.modules.noParse,
      },

      resolve: {
        extensions: ['', '.js', '.less'],
        modulesDirectories: [ fromRoot('node_modules'), assets.root ],
        root: fromRoot(),
        alias: this.modules.aliases
      }
    };
  }
}

module.exports = BaseOptimizer;
