/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
