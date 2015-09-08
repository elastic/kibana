let _ = require('lodash');
let { resolve } = require('path');
let { readFileSync } = require('fs');

let src = require('requirefrom')('src');
let fromRoot = src('utils/fromRoot');
let pathContains = src('utils/pathContains');
let LiveOptimizer = src('optimize/LiveOptimizer');

let id = 'tests';
let globAll = require('./globAll');
let testEntryFileTemplate = _.template(readFileSync(resolve(__dirname, './testBundleEntry.js.tmpl')));

class TestBundler {
  constructor(kbnServer) {
    this.kbnServer = kbnServer;
    this.init = _.once(this.init);
    _.bindAll(this, ['init', 'findTestFiles', 'setupOptimizer', 'render']);
  }

  init() {
    return this.findTestFiles().then(this.setupOptimizer);
  }

  findTestFiles() {
    return globAll(fromRoot('src'), [
      '**/public/**/__tests__/**/*.js'
    ]);
  }

  setupOptimizer(testFiles) {
    let plugins = this.kbnServer.plugins;
    let bundleDir = this.kbnServer.config.get('optimize.bundleDir');

    let deps = [];
    let modules = [];

    if (testFiles) {
      modules = modules.concat(testFiles);
    }

    plugins.forEach(function (plugin) {
      if (!plugin.app) return;
      modules = modules.concat(plugin.app.getModules());
      deps = deps.concat(plugin.app.getRelatedPlugins());
    });

    this.optimizer = new LiveOptimizer({
      sourceMaps: true,
      bundleDir: bundleDir,
      entries: [
        {
          id: id,
          deps: deps,
          modules: modules,
          template: testEntryFileTemplate
        }
      ],
      plugins: plugins
    });

    return this.optimizer.init();
  }

  render() {
    let self = this;
    let first = !this.optimizer;
    let server = this.kbnServer.server;

    return self.init()
    .then(function () {
      server.log(['optimize', 'testHarness', first ? 'info' : 'debug'], 'Test harness built, compiling test bundle');
      return self.optimizer.get(id);
    });
  }
}

module.exports = TestBundler;
