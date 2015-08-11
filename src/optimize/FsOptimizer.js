let { fromNode } = require('bluebird');
let { writeFile } = require('fs');

let BaseOptimizer = require('./BaseOptimizer');
let fromRoot = require('../utils/fromRoot');

module.exports = class FsOptimizer extends BaseOptimizer {
  async init() {
    await this.initCompiler();
  }

  async run() {
    if (!this.compiler) await this.init();

    let stats = await fromNode(cb => {
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
