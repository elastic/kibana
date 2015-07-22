'use strict';

module.exports = function (server, kbnServer) {

  let _ = require('lodash');
  let resolve = require('path').resolve;
  let promify = require('bluebird').promisify;
  let glob = promify(require('glob'));
  let createHash = require('crypto').createHash;
  let pathContains = require('../../../utils/pathContains');
  let LiveOptimizer = require('../../../server/optimize/LiveOptimizer');
  let readFileSync = require('fs').readFileSync;
  let testEntryFileTemplate = _.template(readFileSync(resolve(__dirname, './testEntry.js.tmpl')));

  let hash = function (path) {
    return createHash('sha1').update(path).digest('hex');
  };

  class TestHarnessBuilder {
    constructor(path) {
      this.id = hash(path).slice(0, 8);
      this.path = path;
      this.bundleDir = kbnServer.config.get('optimize.bundleDir');
      this.plugin = _.find(kbnServer.plugins, function (plugin) {
        return pathContains(plugin.publicDir, path);
      });

      this.init = _.once(this.init);
      _.bindAll(this, ['init', 'findTestFiles', 'setupOptimizer', 'render']);
    }

    init() {
      return this.findTestFiles().then(this.setupOptimizer);
    }

    findTestFiles() {
      let path = this.path;

      return glob(
        '**/__tests__/**/*.js',
        {
          cwd: path,
          ignore: ['**/_*.js']
        }
      )
      .map(function (testFile) {
        return resolve(path, testFile);
      });
    }

    setupOptimizer(testFiles) {
      let deps = [];
      let modules = [];

      if (testFiles) {
        modules = modules.concat(testFiles);
      }

      let app = this.plugin && this.plugin.app;
      if (app) {
        deps = deps.concat(app.getRelatedPlugins());

        let appModules = app.getModules();
        modules = appModules.concat(modules);
      }

      this.optimizer = new LiveOptimizer({
        sourceMaps: true,
        bundleDir: this.bundleDir,
        entries: [
          {
            id: this.id,
            deps: deps,
            modules: modules,
            template: testEntryFileTemplate
          }
        ],
        plugins: kbnServer.plugins
      });

      return this.optimizer.init();
    }

    render() {
      let self = this;

      if (this.optimizer) {
        server.log(['optimize', 'testHarness', 'info'], 'Reusing test harness');
      } else {
        server.log(['optimize', 'testHarness', 'info'], 'Building test harness');
      }

      return self.init()
      .then(function () {
        return self.optimizer.get(self.id);
      });
    }
  }

  return TestHarnessBuilder;
};
