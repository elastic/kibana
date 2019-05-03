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

import { ConfigService, Env } from './config';
import { ElasticsearchService } from './elasticsearch';
import { HttpService, HttpServiceSetup, Router } from './http';
import { LegacyService } from './legacy';
import { Logger, LoggerFactory } from './logging';
import { PluginsService } from './plugins';

export class Server {
  private readonly elasticsearch: ElasticsearchService;
  private readonly http: HttpService;
  private readonly plugins: PluginsService;
  private readonly legacy: LegacyService;
  private readonly log: Logger;

  constructor(configService: ConfigService, logger: LoggerFactory, env: Env) {
    const core = { env, configService, logger };
    this.log = logger.get('server');
    this.http = new HttpService(core);
    this.plugins = new PluginsService(core);
    this.legacy = new LegacyService(core);
    this.elasticsearch = new ElasticsearchService(core);
  }

  public async setup() {
    this.log.debug('setting up server');

    const httpSetup = await this.http.setup();
    this.registerDefaultRoute(httpSetup);

    const elasticsearchServiceSetup = await this.elasticsearch.setup();
    const pluginsSetup = await this.plugins.setup({
      elasticsearch: elasticsearchServiceSetup,
      http: httpSetup,
    });

    const coreSetup = {
      elasticsearch: elasticsearchServiceSetup,
      http: httpSetup,
      plugins: pluginsSetup,
    };

    await this.legacy.setup(coreSetup);

    return coreSetup;
  }

  public async start() {
    const httpStart = await this.http.start();
    const plugins = await this.plugins.start({});

    const startDeps = {
      http: httpStart,
      plugins,
    };

    await this.legacy.start(startDeps);

    return startDeps;
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.legacy.stop();
    await this.plugins.stop();
    await this.elasticsearch.stop();
    await this.http.stop();
  }

  private registerDefaultRoute(httpSetup: HttpServiceSetup) {
    const router = new Router('/core');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ version: '0.0.1' }));
    httpSetup.registerRouter(router);
  }
}
