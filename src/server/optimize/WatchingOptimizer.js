'use strict';

let _ = require('lodash');
let webpack = require('webpack');

let BaseOptimizer = require('./BaseOptimizer');

module.exports = class CachedOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);

    this.bundleStatus = null; // options: null, 'built', 'needs rebuild'

    _.bindAll(this, 'init', 'setupCompiler', 'enable', 'disable');
  }

  init(autoRun) {
    return this.bundles.cleanDir().then(autoRun ? this.enable : this.setupCompiler);
  }

  setupCompiler(autoRun) {
    if (!_.size(this.bundles.entries)) return;

    this.compilerConfig = this.getConfig();
    this.compiler = webpack(this.compilerConfig);
    this.compiler.plugin('done', _.bindKey(this, 'setStatus', 'done'));
    this.compiler.plugin('failed', _.bindKey(this, 'setStatus', 'error'));
    this.compiler.plugin('invalid', _.bindKey(this, 'setStatus', 'needs rebuild'));
    this.compiler.plugin('watch-run', _.bindKey(this, 'setStatus', 'rebuilding'));

    if (autoRun) this.enable();
  }

  setStatus(status) {
    let entries = this.bundles.entries;
    let stats;
    let error;

    switch (status) {
      case 'done':
        stats = this.watcher.stats;
        error = null;

        if (stats.hasErrors()) {
          error = new Error('Optimization must not produce errors or warnings');
          status = 'error';
        }
        break;

      case 'error':
        stats = this.watcher.stats;
        error = this.watcher.error;
    }

    this.emit(this.bundleStatus = status, entries, stats, error);
  }

  enable() {
    if (!this.compiler) {
      return this.setupCompiler(true);
    }

    if (this.watcher) {
      throw new Error('WatchingOptimizer already watching!');
    }

    this.watcher = this.compiler.watch(_.noop);
  }

  disable() {
    if (!this.compiler) return;
    if (!this.watcher) return;

    this.watcher.close();
    this.watcher = null;
    this.compiler = null;
  }
};
