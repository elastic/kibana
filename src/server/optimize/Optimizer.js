'use strict';

var EventEmitter = require('events').EventEmitter;
var inherits = require('util').inherits;
var _ = require('lodash');
var join = require('path').join;
var write = require('fs').writeFileSync;
var webpack = require('webpack');

var assets = require('../ui/assets');
var fromRoot = require('../utils/fromRoot');
var OptmzBundles = require('./OptmzBundles');
var OptmzUiModules = require('./OptmzUiModules');
var DirectoryNameAsDefaultFile = require('./DirectoryNameAsDefaultFile');

class Optimizer extends EventEmitter {
  constructor(opts) {
    super();

    this.watch = opts.watch || false;
    this.sourceMaps = opts.sourceMaps || false;
    this.modules = new OptmzUiModules(opts.plugins);
    this.bundles = new OptmzBundles(opts.bundleDir, opts.apps);
  }

  init() {
    return this.bundles.init(this.watch).then(_.bindKey(this, 'startCompiler'));
  }

  startCompiler() {
    var self = this;
    var modules = self.modules;
    var bundles = self.bundles;

    var compiler = webpack({
      entry: bundles.getEntriesToCompile(),

      devtool: this.sourceMaps ? 'inline-source-map' : false,

      output: {
        path: this.bundles.dir,
        publicPath: '/bundles/',
        filename: '[name].js'
      },

      plugins: [
        new webpack.NoErrorsPlugin(),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.OccurenceOrderPlugin(),
        new webpack.ResolverPlugin([
          new DirectoryNameAsDefaultFile()
        ])
      ],

      module: {
        noParse: modules.noParse,
        loaders: modules.loaders
      },

      resolve: {
        extensions: ['', '.js', '.less'],
        packageMains: [],
        modulesDirectories: [ fromRoot('node_modules'), assets.root ],
        root: fromRoot(),
        alias: modules.aliases
      }
    });

    compiler.plugin('watch-run', function (compiler, cb) {
      self.emit('watch-run');
      cb();
    });

    compiler.plugin('done', function (stats) {
      var errCount = _.size(stats.compilation.errors);

      if (errCount) {
        console.log(stats.toString({ colors: true }));
        self.emit('error', new Error('Failed to compile bundle'));
        return;
      }

      self.emit('done');
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
