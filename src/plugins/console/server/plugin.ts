/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { first } from 'rxjs/operators';
import { CoreSetup, Logger, Plugin, PluginInitializerContext } from 'kibana/server';

import { ProxyConfigCollection } from './lib';
import { SpecDefinitionsService, EsLegacyConfigService } from './services';
import { ConfigType } from './config';

import { registerRoutes } from './routes';

import { ESConfigForProxy, ConsoleSetup, ConsoleStart } from './types';

export class ConsoleServerPlugin implements Plugin<ConsoleSetup, ConsoleStart> {
  log: Logger;

  specDefinitionsService = new SpecDefinitionsService();

  esLegacyConfigService = new EsLegacyConfigService();

  constructor(private readonly ctx: PluginInitializerContext<ConfigType>) {
    this.log = this.ctx.logger.get();
  }

  async setup({ http, capabilities, getStartServices, elasticsearch }: CoreSetup) {
    capabilities.registerProvider(() => ({
      dev_tools: {
        show: true,
        save: true,
      },
    }));

    const config = await this.ctx.config.create().pipe(first()).toPromise();
    const globalConfig = await this.ctx.config.legacy.globalConfig$.pipe(first()).toPromise();
    const proxyPathFilters = config.proxyFilter.map((str: string) => new RegExp(str));

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
        proxyConfigCollection: new ProxyConfigCollection(config.proxyConfig),
        readLegacyESConfig: async (): Promise<ESConfigForProxy> => {
          const legacyConfig = await this.esLegacyConfigService.readConfig();
          return {
            ...globalConfig.elasticsearch,
            ...legacyConfig,
          };
        },
        pathFilters: proxyPathFilters,
      },
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
