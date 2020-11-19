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

import { ConnectableObservable, Subscription } from 'rxjs';
import { first, map, publishReplay, switchMap, tap } from 'rxjs/operators';

import { Env, RawConfigurationProvider } from '../config';
import { Logger, LoggerFactory, LoggingConfigType, LoggingSystem } from '../logging';
import { Server } from '../server';

/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export class Root {
  public readonly logger: LoggerFactory;
  private readonly log: Logger;
  private readonly loggingSystem: LoggingSystem;
  private readonly server: Server;
  private loggingConfigSubscription?: Subscription;

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    env: Env,
    private readonly onShutdown?: (reason?: Error | string) => void
  ) {
    this.loggingSystem = new LoggingSystem();
    this.logger = this.loggingSystem.asLoggerFactory();
    this.log = this.logger.get('root');
    this.server = new Server(rawConfigProvider, env, this.loggingSystem);
  }

  public async setup() {
    try {
      await this.server.setupCoreConfig();
      await this.setupLogging();
      this.log.debug('setting up root');
      return await this.server.setup();
    } catch (e) {
      await this.shutdown(e);
      throw e;
    }
  }

  public async start() {
    this.log.debug('starting root');
    try {
      return await this.server.start();
    } catch (e) {
      await this.shutdown(e);
      throw e;
    }
  }

  public async shutdown(reason?: any) {
    this.log.debug('shutting root down');

    if (reason) {
      if (reason.code === 'EADDRINUSE' && Number.isInteger(reason.port)) {
        reason = new Error(
          `Port ${reason.port} is already in use. Another instance of Kibana may be running!`
        );
      }

      this.log.fatal(reason);
    }

    await this.server.stop();

    if (this.loggingConfigSubscription !== undefined) {
      this.loggingConfigSubscription.unsubscribe();
      this.loggingConfigSubscription = undefined;
    }
    await this.loggingSystem.stop();

    if (this.onShutdown !== undefined) {
      this.onShutdown(reason);
    }
  }

  private async setupLogging() {
    const { configService } = this.server;
    // Stream that maps config updates to logger updates, including update failures.
    const update$ = configService.getConfig$().pipe(
      // always read the logging config when the underlying config object is re-read
      switchMap(() => configService.atPath<LoggingConfigType>('logging')),
      map((config) => this.loggingSystem.upgrade(config)),
      // This specifically console.logs because we were not able to configure the logger.
      // eslint-disable-next-line no-console
      tap({ error: (err) => console.error('Configuring logger failed:', err) }),
      publishReplay(1)
    ) as ConnectableObservable<void>;

    // Subscription and wait for the first update to complete and throw if it fails.
    const connectSubscription = update$.connect();
    await update$.pipe(first()).toPromise();

    // Send subsequent update failures to this.shutdown(), stopped via loggingConfigSubscription.
    this.loggingConfigSubscription = update$.subscribe({
      error: (err) => this.shutdown(err),
    });

    // Add subscription we got from `connect` so that we can dispose both of them
    // at once. We can't inverse this and add consequent updates subscription to
    // the one we got from `connect` because in the error case the latter will be
    // automatically disposed before the error is forwarded to the former one so
    // the shutdown logic won't be called.
    this.loggingConfigSubscription.add(connectSubscription);
  }
}
