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
import { HttpConfig, HttpModule, Router } from './http';
import { Logger, LoggerFactory } from './logging';

export class Server {
  private readonly http: HttpModule;
  private readonly log: Logger;

  constructor(private readonly configService: ConfigService, logger: LoggerFactory, env: Env) {
    this.log = logger.get('server');

    const httpConfig$ = configService.atPath('server', HttpConfig);
    this.http = new HttpModule(httpConfig$, logger, env);
  }

  public async start() {
    this.log.debug('starting server :tada:');

    const router = new Router('/core');
    router.get({ path: '/', validate: false }, async (req, res) => res.ok({ version: '0.0.1' }));
    this.http.service.registerRouter(router);

    await this.http.service.start();

    const unhandledConfigPaths = await this.configService.getUnusedPaths();
    if (unhandledConfigPaths.length > 0) {
      throw new Error(`some config paths are not handled: ${JSON.stringify(unhandledConfigPaths)}`);
    }
  }

  public async stop() {
    this.log.debug('stopping server');

    await this.http.service.stop();
  }
}
