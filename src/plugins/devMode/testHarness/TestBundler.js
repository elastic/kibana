'use strict';

module.exports = function (server, kbnServer) {

  let _ = require('lodash');
  let resolve = require('path').resolve;
  let promify = require('bluebird').promisify;
  let all = require('bluebird').all;
  let createHash = require('crypto').createHash;
  let pathContains = require('../../../utils/pathContains');
  let LiveOptimizer = require('../../../server/optimize/LiveOptimizer');
  let readFileSync = require('fs').readFileSync;
  let testEntryFileTemplate = _.template(readFileSync(resolve(__dirname, './testEntry.js.tmpl')));

  let globAll = _.wrap(promify(require('glob')), function (g, path, patterns) {
    return all([].concat(patterns || []))
    .map(function (pattern) {
      return g(pattern, { cwd: path, ignore: '**/_*.js' });
    })
    .then(_.flatten)
    .then(_.uniq)
    .map(function (match) {
      return resolve(path, match);
    });
  });

  let hash = function (path) {
    return createHash('sha1').update(path).digest('hex');
  };

  class TestHarnessBuilder {
    constructor(path) {
      this.id = hash(path).slice(0, 8);
      this.path = path;
      this.bundleDir = kbnServer.config.get('optimize.bundleDir');

      this.init = _.once(this.init);
      _.bindAll(this, ['init', 'findTestFiles', 'setupOptimizer', 'render']);
    }

    init() {
      return this.findTestFiles().then(this.setupOptimizer);
    }

    findTestFiles() {
      return globAll(this.path, [
        'ui/**/__tests__/**/*.js',
        '**/public/**/__tests__/**/*.js'
      ]);
    }

    setupOptimizer(testFiles) {
      let path = this.path;
      let deps = [];
      let modules = [];

      if (testFiles) {
        modules = modules.concat(testFiles);
      }

      kbnServer.plugins.forEach(function (plugin) {
        if (!plugin.app) return;
        if (!pathContains(plugin.publicDir, path)) return;

        modules = modules.concat(plugin.app.getModules());
        deps = deps.concat(plugin.app.getRelatedPlugins());
      });

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
      let first = false;

      if (!this.optimizer) {
        first = true;
        server.log(['optimize', 'testHarness', 'info'], 'Building test harness');
      } else {
        server.log(['optimize', 'testHarness', 'debug'], 'Reusing test harness');
      }

      return self.init()
      .then(function () {
        server.log(['optimize', 'testHarness', first ? 'info' : 'debug'], 'Test harness build complete');
        return self.optimizer.get(self.id);
      });
    }
  }

  return TestHarnessBuilder;
};
