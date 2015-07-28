'use strict';

let _ = require('lodash');
let webpack = require('webpack');

let BaseOptimizer = require('./BaseOptimizer');

module.exports = class CachedOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);
    _.bindAll(this, 'init', 'setupCompiler', 'run');
  }

  init(autoRun) {
    return this.bundles.ensureAllEntriesExist().then(autoRun ? this.run : this.setupCompiler);
  }

  setupCompiler(autoRun) {
    this.entries = this.bundles.getMissingEntries();
    if (!this.entries.length) return;

    this.compilerConfig = this.getConfig();
    this.compiler = webpack(this.compilerConfig);

    if (autoRun) this.run();
  }

  run() {
    if (!this.compiler) {
      return this.setupCompiler(true);
    }

    var self = this;
    let entries = self.entries;

    self.emit('build-start', entries);
    self.compiler.run(function (err, stats) {
      if (err) {
        self.emit('error', entries, stats, err);
      }
      else if (stats.hasErrors() || stats.hasWarnings()) {
        self.emit('error', entries, stats, new Error('Optimization must not produce errors or warnings'));
      }
      else {
        self.emit('done', entries, stats);
      }
    });
  }
};
