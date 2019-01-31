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

import { PluginsModule } from './plugins';

export { bootstrap } from './bootstrap';

import { first } from 'rxjs/operators';
import { ConfigService, Env } from './config';
import { HttpConfig, HttpModule, HttpServerInfo } from './http';
import { LegacyCompatModule } from './legacy_compat';
import { Logger, LoggerFactory } from './logging';

export class Server {
  private readonly http: HttpModule;
  private readonly plugins: PluginsModule;
  private readonly legacy: LegacyCompatModule;
  private readonly log: Logger;

  constructor(configService: ConfigService, logger: LoggerFactory, private readonly env: Env) {
    this.log = logger.get('server');

    this.http = new HttpModule(configService.atPath('server', HttpConfig), logger);

    const core = { env, configService, logger };
    this.plugins = new PluginsModule(core);
    this.legacy = new LegacyCompatModule(core);
  }

  public async start() {
    this.log.debug('starting server');

    // We shouldn't start http service in two cases:
    // 1. If `server.autoListen` is explicitly set to `false`.
    // 2. When the process is run as dev cluster master in which case cluster manager
    // will fork a dedicated process where http service will be started instead.
    let httpStartContract: HttpServerInfo | undefined;
    const httpConfig = await this.http.config$.pipe(first()).toPromise();
    if (!this.env.isDevClusterMaster && httpConfig.autoListen) {
      httpStartContract = await this.http.service.start();
    }

    const pluginsStartContract = await this.plugins.service.start();

    await this.legacy.service.start({
      http: httpStartContract,
      plugins: pluginsStartContract,
    });
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.legacy.service.stop();
    await this.plugins.service.stop();
    await this.http.service.stop();
  }
}
