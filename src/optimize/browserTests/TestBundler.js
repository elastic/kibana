let { once, template } = require('lodash');
let { resolve } = require('path');
let { readFileSync } = require('fs');

let src = require('requirefrom')('src');
let fromRoot = src('utils/fromRoot');
let LiveOptimizer = src('optimize/LiveOptimizer');

let id = 'tests';
let globAll = require('./globAll');
let testEntryFileTemplate = template(readFileSync(resolve(__dirname, './testBundleEntry.js.tmpl')));

class TestBundler {
  constructor(kbnServer) {
    this.hapi = kbnServer.server;
    this.plugins = kbnServer.plugins;
    this.bundleDir = kbnServer.config.get('optimize.bundleDir');
    this.init = once(this.init);
  }

  async init() {
    await this.findTestFiles();
    await this.setupOptimizer();
  }

  async findTestFiles() {
    await globAll(fromRoot('.'), [
      'src/**/public/**/__tests__/**/*.js',
      'installedPlugins/**/public/**/__tests__/**/*.js'
    ]);
  }

  async setupOptimizer(testFiles) {
    let deps = [];
    let modules = [];

    if (testFiles) {
      modules = modules.concat(testFiles);
    }

    this.plugins.forEach(function (plugin) {
      if (!plugin.app) return;
      modules = modules.concat(plugin.app.getModules());
      deps = deps.concat(plugin.app.getRelatedPlugins());
    });

    this.optimizer = new LiveOptimizer({
      sourceMaps: true,
      bundleDir: this.bundleDir,
      entries: [
        {
          id: id,
          deps: deps,
          modules: modules,
          template: testEntryFileTemplate
        }
      ],
      plugins: this.plugins
    });

    await this.optimizer.init();

    this.optimizer.bindToServer(this.hapi);
  }
}

module.exports = TestBundler;
