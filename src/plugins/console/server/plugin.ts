/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import { SemVer } from 'semver';

import { ProxyConfigCollection } from './lib';
import { SpecDefinitionsService, EsLegacyConfigService } from './services';
import { ConsoleConfig, ConsoleConfig7x } from './config';

import { registerRoutes } from './routes';

import { ESConfigForProxy, ConsoleSetup, ConsoleStart } from './types';

export class ConsoleServerPlugin implements Plugin<ConsoleSetup, ConsoleStart> {
  log: Logger;

  specDefinitionsService = new SpecDefinitionsService();

  esLegacyConfigService = new EsLegacyConfigService();

  constructor(private readonly ctx: PluginInitializerContext<ConsoleConfig | ConsoleConfig7x>) {
    this.log = this.ctx.logger.get();
  }

  setup({ http, capabilities, elasticsearch }: CoreSetup) {
    capabilities.registerProvider(() => ({
      dev_tools: {
        show: true,
        save: true,
      },
    }));
    const kibanaVersion = new SemVer(this.ctx.env.packageInfo.version);
    const config = this.ctx.config.get();
    const globalConfig = this.ctx.config.legacy.get();

    let pathFilters: RegExp[] | undefined;
    let proxyConfigCollection: ProxyConfigCollection | undefined;
    if (kibanaVersion.major < 8) {
      // "pathFilters" and "proxyConfig" are only used in 7.x
      pathFilters = (config as ConsoleConfig7x).proxyFilter.map((str: string) => new RegExp(str));
      proxyConfigCollection = new ProxyConfigCollection((config as ConsoleConfig7x).proxyConfig);
    }

    this.esLegacyConfigService.setup(elasticsearch.legacy.config$);

    const router = http.createRouter();

    registerRoutes({
      router,
      log: this.log,
      services: {
        esLegacyConfigService: this.esLegacyConfigService,
        specDefinitionService: this.specDefinitionsService,
      },
      proxy: {
        readLegacyESConfig: async (): Promise<ESConfigForProxy> => {
          const legacyConfig = await this.esLegacyConfigService.readConfig();
          return {
            ...globalConfig.elasticsearch,
            ...legacyConfig,
          };
        },
        // Deprecated settings (only used in 7.x):
        proxyConfigCollection,
        pathFilters,
      },
      kibanaVersion,
    });

    return {
      ...this.specDefinitionsService.setup(),
    };
  }

  start() {
    return {
      ...this.specDefinitionsService.start(),
    };
  }

  stop() {
    this.esLegacyConfigService.stop();
  }
}
