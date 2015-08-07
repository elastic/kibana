let { fromNode } = require('bluebird');
let BaseOptimizer = require('./BaseOptimizer');

module.exports = class FsOptimizer extends BaseOptimizer {
  async init() {
    await this.bundles.writeEntryFiles();
    await this.bundles.filterCachedBundles();
  }

  async run() {
    await this.initCompiler();
    await fromNode(cb => {
      this.compiler.run((err, stats) => {
        if (err || !stats) return cb(err);

        if (stats.hasErrors() || stats.hasWarnings()) {
          let err = new Error('Optimization must not produce errors or warnings');
          err.stats = stats;
          return cb(err);
        }
        else {
          cb(null, stats);
        }
      });
    });
  }
};
