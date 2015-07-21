'use strict';

module.exports = function (kbnServer) {

  let _ = require('lodash');
  let resolve = require('path').resolve;
  let promify = require('bluebird').promisify;
  let glob = promify(require('glob'));
  let createHash = require('crypto').createHash;
  let pathContains = require('../../utils/pathContains');
  let LiveOptimizer = require('../../server/optimize/LiveOptimizer');
  let readFileSync = require('fs').readFileSync;
  let testEntryFileTemplate = _.template(readFileSync(resolve(__dirname, './testEntry.js.tmpl')));

  let hash = function (prefix) {
    return createHash('sha1').update(prefix).digest('hex');
  };

  class TestHarnessBuilder {
    constructor(prefix) {
      this.id = hash(prefix).slice(0, 8);
      this.prefix = prefix;
      this.bundleDir = kbnServer.config.get('optimize.bundleDir');
      this.plugin = _.find(kbnServer.plugins, function (plugin) {
        return pathContains(plugin.publicDir, prefix);
      });

      this.init = _.once(this.init);
      _.bindAll(this, ['init', 'findTestFiles', 'setupOptimizer', 'render']);
    }

    init() {
      return this.findTestFiles().then(this.setupOptimizer);
    }

    findTestFiles() {
      let prefix = this.prefix;

      return glob(
        '**/__tests__/**/*.js',
        {
          cwd: prefix,
          ignore: ['**/_*.js']
        }
      )
      .map(function (testFile) {
        return resolve(prefix, testFile);
      });
    }

    setupOptimizer(testFiles) {
      let deps = [];
      let modules = {
        angular: [],
        require: []
      };

      if (testFiles) {
        modules.require = modules.require.concat(testFiles);
      }

      let app = this.plugin && this.plugin.app;
      if (app) {
        deps = deps.concat(app.getRelatedPlugins());

        let appModules = app.getModules();
        modules.angular = appModules.angular.concat(modules.angular);
        modules.require = appModules.require.concat(modules.require);
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

      return self.init()
      .then(function () {
        return self.optimizer.get(self.id);
      });
    }
  }

  return TestHarnessBuilder;
};
