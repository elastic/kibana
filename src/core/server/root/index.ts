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

import { Observable, Subscription } from 'rxjs';
import { catchError, first, map, shareReplay } from 'rxjs/operators';

import { Server } from '..';
import { ConfigService, Env, RawConfig } from '../config';

import { Logger, LoggerFactory, LoggingConfig, LoggingService } from '../logging';

export type OnShutdown = (reason?: Error) => void;

/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export class Root {
  public readonly logger: LoggerFactory;
  protected readonly configService: ConfigService;
  private readonly log: Logger;
  private server?: Server;
  private readonly loggingService: LoggingService;
  private loggingConfigSubscription?: Subscription;

  constructor(
    rawConfig$: Observable<RawConfig>,
    private readonly env: Env,
    private readonly onShutdown: OnShutdown = () => {
      // noop
    }
  ) {
    this.loggingService = new LoggingService();
    this.logger = this.loggingService.asLoggerFactory();

    this.log = this.logger.get('root');
    this.configService = new ConfigService(rawConfig$, env, this.logger);
  }

  public async start() {
    this.log.debug('starting root');

    try {
      await this.setupLogging();
      await this.startServer();
    } catch (e) {
      await this.shutdown(e);
      throw e;
    }
  }

  public async shutdown(reason?: Error) {
    this.log.debug('shutting root down');

    await this.stopServer();

    if (this.loggingConfigSubscription !== undefined) {
      this.loggingConfigSubscription.unsubscribe();
      this.loggingConfigSubscription = undefined;
    }

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

  private async setupLogging() {
    // Stream that maps config updates to logger updates, including update failures.
    const update$ = this.configService.atPath('logging', LoggingConfig).pipe(
      map(config => this.loggingService.upgrade(config)),
      catchError(err => {
        // This specifically console.logs because we were not able to configure the logger.
        // tslint:disable-next-line no-console
        console.error('Configuring logger failed:', err);

        throw err;
      }),
      shareReplay(1)
    );

    // Wait for the first update to complete and throw if it fails.
    await update$.pipe(first()).toPromise();

    // Send subsequent update failures to this.shutdown(), stopped via loggingConfigSubscription.
    this.loggingConfigSubscription = update$.subscribe({
      error: error => this.shutdown(error),
    });
  }
}
