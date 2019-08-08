"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.FunctionalTestRunner = void 0;

var _lib = require("./lib");

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

class FunctionalTestRunner {
  constructor(log, configFile, configOverrides) {
    this.log = log;
    this.configFile = configFile;
    this.configOverrides = configOverrides;

    _defineProperty(this, "lifecycle", (0, _lib.createLifecycle)());

    _defineProperty(this, "closed", false);

    this.lifecycle.on('phaseStart', name => {
      log.verbose('starting %j lifecycle phase', name);
    });
    this.lifecycle.on('phaseEnd', name => {
      log.verbose('ending %j lifecycle phase', name);
    });
  }

  async run() {
    return await this._run(async (config, coreProviders) => {
      const providers = new _lib.ProviderCollection(this.log, [...coreProviders, ...(0, _lib.readProviderSpec)('Service', config.get('services')), ...(0, _lib.readProviderSpec)('PageObject', config.get('pageObjects'))]);
      await providers.loadAll();
      const mocha = await (0, _lib.setupMocha)(this.lifecycle, this.log, config, providers);
      await this.lifecycle.trigger('beforeTests');
      this.log.info('Starting tests');
      return await (0, _lib.runTests)(this.lifecycle, mocha);
    });
  }

  async getTestStats() {
    return await this._run(async (config, coreProviders) => {
      // replace the function of custom service providers so that they return
      // promise-like objects which never resolve, essentially disabling them
      // allowing us to load the test files and populate the mocha suites
      const readStubbedProviderSpec = (type, providers) => (0, _lib.readProviderSpec)(type, providers).map(p => ({ ...p,
        fn: () => ({
          then: () => {}
        })
      }));

      const providers = new _lib.ProviderCollection(this.log, [...coreProviders, ...readStubbedProviderSpec('Service', config.get('services')), ...readStubbedProviderSpec('PageObject', config.get('pageObjects'))]);
      const mocha = await (0, _lib.setupMocha)(this.lifecycle, this.log, config, providers);

      const countTests = suite => suite.suites.reduce((sum, s) => sum + countTests(s), suite.tests.length);

      return {
        testCount: countTests(mocha.suite),
        excludedTests: mocha.excludedTests.map(t => t.fullTitle())
      };
    });
  }

  async _run(handler) {
    let runErrorOccurred = false;

    try {
      const config = await (0, _lib.readConfigFile)(this.log, this.configFile, this.configOverrides);
      this.log.info('Config loaded');

      if (config.get('testFiles').length === 0) {
        throw new Error('No test files defined.');
      } // base level services that functional_test_runner exposes


      const coreProviders = (0, _lib.readProviderSpec)('Service', {
        lifecycle: () => this.lifecycle,
        log: () => this.log,
        config: () => config
      });
      return await handler(config, coreProviders);
    } catch (runError) {
      runErrorOccurred = true;
      throw runError;
    } finally {
      try {
        await this.close();
      } catch (closeError) {
        if (runErrorOccurred) {
          this.log.error('failed to close functional_test_runner');
          this.log.error(closeError);
        } else {
          // eslint-disable-next-line no-unsafe-finally
          throw closeError;
        }
      }
    }
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    await this.lifecycle.trigger('cleanup');
  }

}

exports.FunctionalTestRunner = FunctionalTestRunner;