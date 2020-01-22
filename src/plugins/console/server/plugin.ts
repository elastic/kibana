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
import { ConfigType } from '.';

import { readLegacyEsConfig } from '../../../legacy/core_plugins/console_legacy';

import { registerProxyRoute } from './routes/api/console/proxy';
import { registerSpecDefinitionsRoute } from './routes/api/console/spec_definitions';
import { ESConfigForProxy } from './types';

export class ConsoleServerPlugin implements Plugin {
  log: Logger;

  constructor(private readonly ctx: PluginInitializerContext<ConfigType>) {
    this.log = this.ctx.logger.get();
  }

  async setup({ http }: CoreSetup) {
    const config = await this.ctx.config
      .create()
      .pipe(first())
      .toPromise();

    const { elasticsearch } = await this.ctx.config.legacy.globalConfig$.pipe(first()).toPromise();

    const proxyPathFilters = config.proxyFilter.map((str: string) => new RegExp(str));

    const router = http.createRouter();

    registerProxyRoute({
      log: this.log,
      proxyConfigCollection: new ProxyConfigCollection(config.proxyConfig),
      readLegacyESConfig: (): ESConfigForProxy => {
        const legacyConfig = readLegacyEsConfig();
        return {
          ...elasticsearch,
          hosts: legacyConfig.hosts,
          requestHeadersWhitelist: legacyConfig.requestHeadersWhitelist,
          customHeaders: legacyConfig.customHeaders,
        };
      },
      pathFilters: proxyPathFilters,
      router,
    });

    registerSpecDefinitionsRoute({ router });
  }
  async start() {}
  stop() {}
}
