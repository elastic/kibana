let _ = require('lodash');
let { join } = require('path');
let { promisify } = require('bluebird');
let webpack = require('webpack');
let MemoryFileSystem = require('memory-fs');
let BaseOptimizer = require('./BaseOptimizer');

module.exports = class LiveOptimizer extends BaseOptimizer {
  constructor(opts) {
    super(opts);

    this.compilerConfig = this.getConfig();
    // this.compilerConfig.profile = true;

    this.compiler = webpack(this.compilerConfig);
    this.outFs = this.compiler.outputFileSystem = new MemoryFileSystem();

    _.bindAll(this, 'get', 'init');

    this.compile = promisify(this.compiler.run, this.compiler);
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

      return {
        bundle: fs.readFileSync(filename),
        sourceMap: self.sourceMaps ? fs.readFileSync(mapFilename) : false,
        style: fs.readFileSync(styleFilename)
      };
    });
  }
};
