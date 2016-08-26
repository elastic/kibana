
import BaseOptimizer from './base_optimizer';
import { fromNode } from 'bluebird';

module.exports = class FsOptimizer extends BaseOptimizer {
  async init() {
    await this.initCompiler();
  }

  async run() {
    if (!this.compiler) await this.init();

    await fromNode(cb => {
      this.compiler.run((err, stats) => {
        if (err || !stats) return cb(err);

        if (stats.hasErrors() || stats.hasWarnings()) {
          return cb(this.failedStatsToError(stats));
        }
        else {
          cb(null, stats);
        }
      });
    });
  }
};
