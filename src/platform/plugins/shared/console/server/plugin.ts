/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';

import { SpecDefinitionsService, EsLegacyConfigService } from './services';
import type { ConsoleConfig } from './config';

import { registerRoutes } from './routes';

import type { ESConfigForProxy, ConsoleSetup, ConsoleStart } from './types';
import { handleEsError } from './shared_imports';

interface PluginsSetup {
  cloud?: CloudSetup;
}
export class ConsoleServerPlugin implements Plugin<ConsoleSetup, ConsoleStart> {
  log: Logger;

  specDefinitionsService = new SpecDefinitionsService();

  esLegacyConfigService = new EsLegacyConfigService();

  constructor(private readonly ctx: PluginInitializerContext<ConsoleConfig>) {
    this.log = this.ctx.logger.get();
  }

  setup({ http, capabilities, elasticsearch }: CoreSetup, { cloud }: PluginsSetup) {
    capabilities.registerProvider(() => ({
      dev_tools: {
        show: true,
        save: true,
      },
    }));
    const globalConfig = this.ctx.config.legacy.get();

    this.esLegacyConfigService.setup(elasticsearch.legacy.config$, cloud);

    const router = http.createRouter();

    registerRoutes({
      router,
      log: this.log,
      services: {
        esLegacyConfigService: this.esLegacyConfigService,
        specDefinitionService: this.specDefinitionsService,
      },
      lib: {
        handleEsError,
      },
      proxy: {
        readLegacyESConfig: async (): Promise<ESConfigForProxy> => {
          const legacyConfig = await this.esLegacyConfigService.readConfig();
          return {
            ...globalConfig.elasticsearch,
            ...legacyConfig,
          };
        },
      },
    });
  }

  start() {
    const {
      autocompleteDefinitions: { endpointsAvailability: endpointsAvailability },
    } = this.ctx.config.get<ConsoleConfig>();
    this.specDefinitionsService.start({ endpointsAvailability });

    return {
      getSpecJson: () => this.specDefinitionsService.asJson(),
    };
  }

  stop() {
    this.esLegacyConfigService.stop();
  }
}
