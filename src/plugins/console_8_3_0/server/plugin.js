/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const _interopRequireDefault = require('@babel/runtime/helpers/interopRequireDefault');

Object.defineProperty(exports, '__esModule', {
  value: true,
});
exports.ConsoleServerPlugin = void 0;

const _defineProperty2 = _interopRequireDefault(require('@babel/runtime/helpers/defineProperty'));

const _semver = require('semver');

const _lib = require('./lib');

const _services = require('./services');

const _routes = require('./routes');

class ConsoleServerPlugin {
  constructor(ctx) {
    (0, _defineProperty2.default)(this, 'log', void 0);
    (0, _defineProperty2.default)(
      this,
      'specDefinitionsService',
      new _services.SpecDefinitionsService()
    );
    (0, _defineProperty2.default)(
      this,
      'esLegacyConfigService',
      new _services.EsLegacyConfigService()
    );
    this.ctx = ctx;
    this.log = this.ctx.logger.get();
  }

  setup({ http, capabilities, elasticsearch }) {
    console.log('CALLED SETUP INSIDE');
    capabilities.registerProvider(() => ({
      dev_tools: {
        show: true,
        save: true,
      },
    }));
    const kibanaVersion = new _semver.SemVer(this.ctx.env.packageInfo.version);
    const config = this.ctx.config.get();
    const globalConfig = this.ctx.config.legacy.get();
    let pathFilters;
    let proxyConfigCollection;

    if (kibanaVersion.major < 8) {
      // "pathFilters" and "proxyConfig" are only used in 7.x
      pathFilters = config.proxyFilter.map((str) => new RegExp(str));
      proxyConfigCollection = new _lib.ProxyConfigCollection(config.proxyConfig);
    }

    this.esLegacyConfigService.setup(elasticsearch.legacy.config$);
    const router = http.createRouter();
    (0, _routes.registerRoutes)({
      router,
      log: this.log,
      services: {
        esLegacyConfigService: this.esLegacyConfigService,
        specDefinitionService: this.specDefinitionsService,
      },
      proxy: {
        readLegacyESConfig: async () => {
          const legacyConfig = await this.esLegacyConfigService.readConfig();
          return { ...globalConfig.elasticsearch, ...legacyConfig };
        },
        // Deprecated settings (only used in 7.x):
        proxyConfigCollection,
        pathFilters,
      },
      kibanaVersion,
    });
    console.log('COMPLETE SETUP INSIDE');
    return { ...this.specDefinitionsService.setup() };
  }

  start() {
    console.log('CALL START');
    return { ...this.specDefinitionsService.start() };
  }

  stop() {
    console.log('CALL stop');
    this.esLegacyConfigService.stop();
  }
}

exports.ConsoleServerPlugin = ConsoleServerPlugin;
