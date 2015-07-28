'use strict';

let _ = require('lodash');
let join = require('path').join;
let promify = require('bluebird').promisify;
let webpack = require('webpack');
let MemoryFileSystem = require('memory-fs');
let BaseOptimizer = require('./BaseOptimizer');
let writeFileSync = require('fs').writeFileSync;

module.exports = class LiveOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);

    this.compilerConfig = this.getConfig();
    // this.compilerConfig.profile = true;

    this.compiler = webpack(this.compilerConfig);
    this.outFs = this.compiler.outputFileSystem = new MemoryFileSystem();

    _.bindAll(this, 'get', 'init');

    this.compile = promify(this.compiler.run, this.compiler);
  }

  init() {
    return this.bundles.ensureAllEntriesExist(true);
  }

  get(id) {
    let self = this;
    let fs = self.outFs;
    let filename = join(self.compiler.outputPath, `${id}.bundle.js`);
    let mapFilename = join(self.compiler.outputPath, `${id}.bundle.js.map`);
    let styleFilename = join(self.compiler.outputPath, `${id}.style.css`);

    if (!self.active) {
      self.active = self.compile().finally(function () {
        self.active = null;
      });
    }

    return self.active.then(function (stats) {
      if (stats.hasErrors() || stats.hasWarnings()) {
        console.log(stats.toString({ colors: true }));
        return null;
      }

      // writeFileSync('liveBuildStats.json', JSON.stringify(stats.toJson()));

      return {
        bundle: fs.readFileSync(filename),
        sourceMap: self.sourceMaps ? fs.readFileSync(mapFilename) : false,
        style: fs.readFileSync(styleFilename)
      };
    });
  }
};
