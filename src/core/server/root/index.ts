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

import { Observable } from '../../lib/kbn_observable';

import { Server } from '..';
import { ConfigService, Env, RawConfig } from '../config';

import { Logger } from '../logging';
import { LoggerFactory, MutableLoggerFactory } from '../logging/logger_factory';
import { LoggingConfig } from '../logging/logging_config';
import { LoggingService } from '../logging/logging_service';

export type OnShutdown = (reason?: Error) => void;

/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export class Root {
  public configService: ConfigService;
  public readonly log: Logger;
  public readonly logger: LoggerFactory;
  private server?: Server;
  private readonly loggingService: LoggingService;

  constructor(
    rawConfig$: Observable<RawConfig>,
    private readonly env: Env,
    private readonly onShutdown: OnShutdown = () => {
      // noop
    }
  ) {
    const loggerFactory = new MutableLoggerFactory(env);
    this.loggingService = new LoggingService(loggerFactory);
    this.logger = loggerFactory;

    this.log = this.logger.get('root');
    this.configService = new ConfigService(rawConfig$, env, this.logger);
  }

  public async start() {
    try {
      const loggingConfig$ = this.configService.atPath('logging', LoggingConfig);
      this.loggingService.upgrade(loggingConfig$);
    } catch (e) {
      // This specifically console.logs because we were not able to configure
      // the logger.
      // tslint:disable no-console
      console.error('Configuring logger failed:', e.message);

      await this.shutdown(e);
      throw e;
    }

    try {
      await this.startServer();
    } catch (e) {
      this.log.error(e);

      await this.shutdown(e);
      throw e;
    }
  }

  public async shutdown(reason?: Error) {
    await this.stopServer();

    await this.loggingService.stop();

    this.onShutdown(reason);
  }

  protected async startServer() {
    this.server = new Server(this.configService, this.logger, this.env);
    return this.server.start();
  }

  protected async stopServer() {
    if (this.server === undefined) {
      return;
    }

    await this.server.stop();
    this.server = undefined;
  }
}
