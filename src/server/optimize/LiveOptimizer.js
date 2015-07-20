'use strict';

let _ = require('lodash');
let join = require('path').join;
let promify = require('bluebird').promisify;
let webpack = require('webpack');
let MemoryFileSystem = require('memory-fs');
let BaseOptimizer = require('./BaseOptimizer');

module.exports = class LiveOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);

    this.compilerConfig = this.getConfig();
    this.compiler = webpack(this.compilerConfig);
    this.outFs = this.compiler.outputFileSystem = new MemoryFileSystem();

    _.bindAll(this, 'get', 'init');

    this.compile = promify(this.compiler.run, this.compiler);
  }

  init() {
    this.bundles.synchronize();
  }

  get(id) {
    let self = this;
    let fs = self.outFs;
    let filename = join(self.compiler.outputPath, `${id}.bundle.js`);
    let mapFilename = filename + '.map';

    self.active = (self.active || self.compile().finally(function () {
      self.active = null;
    }));

    return self.active.then(function (stats) {
      if (stats.hasErrors() || stats.hasWarnings()) {
        console.log(stats.toString({ colors: true }));
        return null;
      }

      try {
        return {
          bundle: fs.readFileSync(filename),
          map: self.sourceMaps ? fs.readFileSync(mapFilename) : false
        };
      } catch (e) {
        return null;
      }
    });
  }
};
