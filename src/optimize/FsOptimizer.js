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
          let err = new Error('Optimization must not produce errors or warnings');
          err.stats = stats;
          return cb(err);
        }
        else {
          cb(null, stats);
        }
      });
    });

    if (this.profile) {
      await fromNode(cb => {
        writeFile(
          fromRoot('webpackstats.json'),
          JSON.stringify(stats.toJson()),
          { encoding: 'utf8' },
          cb
        );
      });
    }
  }
};
