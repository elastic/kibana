'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var _ = require('lodash');
var join = require('path').join;
var write = require('fs').writeFileSync;
var webpack = require('webpack');

var assets = require('../ui/assets');
var fromRoot = require('../../utils/fromRoot');
var OptmzBundles = require('./OptmzBundles');
var OptmzUiModules = require('./OptmzUiModules');
var DirectoryNameAsDefaultFile = require('./DirectoryNameAsDefaultFile');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

class Optimizer extends EventEmitter {
  constructor(opts) {
    super();

    this.verbose = opts.verbose;
    this.watch = opts.watch || false;
    this.sourceMaps = opts.sourceMaps || false;
    this.modules = new OptmzUiModules(opts.plugins);
    this.bundles = new OptmzBundles(opts);
  }

  init() {
    return this.bundles.init(this.watch).then(_.bindKey(this, 'startCompiler'));
  }

  startCompiler() {
    var self = this;
    var modules = self.modules;
    var bundles = self.bundles;

    this.webpackConfig = {
      entry: bundles.getEntriesToCompile(),

      devtool: this.sourceMaps ? '#source-map' : false,

      output: {
        path: bundles.dir,
        filename: '[name].js',
        sourceMapFilename: '[file].map',
        publicPath: '/bundles/',
        devtoolModuleFilenameTemplate: '[resource-path]'
      },

      plugins: [
        new webpack.ResolverPlugin([
          new DirectoryNameAsDefaultFile()
        ]),
        new webpack.NoErrorsPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new ExtractTextPlugin('[name].style.css', {
          allChunks: true
        })
      ],

      module: {
        loaders: [
          { test: /\.less$/, loader: ExtractTextPlugin.extract('style', 'css?sourceMap!less?sourceMap') },
          { test: /\.css$/, loader: ExtractTextPlugin.extract('style', 'css?sourceMap') },
          { test: /\.(html|tmpl)$/, loader: 'raw' },
          { test: /\.png$/, loader: 'url?limit=2048!file?name=[path][name].[ext]' },
          { test: /\.(woff|woff2|ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/, loader: 'file?name=[path][name].[ext]' },
        ].concat(modules.loaders),
        noParse: modules.noParse,
      },

      resolve: {
        extensions: ['', '.js', '.less'],
        modulesDirectories: [ fromRoot('node_modules'), assets.root ],
        root: fromRoot(),
        alias: modules.aliases
      }
    };

    var compiler = webpack(this.webpackConfig);

    compiler.plugin('watch-run', function (compiler, cb) {
      self.emit('watch-run');
      cb();
    });

    compiler.plugin('done', function (stats) {
      var errCount = _.size(stats.compilation.errors);

      if (errCount) {
        self.emit('error', stats, new Error('Failed to compile bundle'));
      } else {
        self.emit('done', stats);
      }
    });

    compiler.plugin('failed', onFail);
    function onFail(err) {
      self.emit('error', err);
    }

    process.nextTick(function () {
      if (self.watch) {
        compiler.watch({
          aggregateTimeout: 300
        }, _.noop);
      } else {
        self.emit('build-start');
        compiler.run(function (err) {
          err && onFail(err);
        });
      }
    });

    return compiler;
  }
}

module.exports = Optimizer;
