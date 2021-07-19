/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ConnectableObservable, Subscription } from 'rxjs';
import { concatMap, first, publishReplay, switchMap, tap } from 'rxjs/operators';
import { Logger, LoggerFactory } from '@kbn/logging';
import { Env, RawConfigurationProvider, ConfigService } from '@kbn/config';
import { setupCoreConfig } from '../config';
import { LoggingConfigType, LoggingSystem } from '../logging';
import { NodeManager, NodeInfo } from '../node';
import { KibanaRoot } from './types';

/**
 * Root class for the Kibana coordinator in node clustering mode
 */
export class KibanaCoordinator implements KibanaRoot {
  public readonly logger: LoggerFactory;
  private readonly log: Logger;
  private readonly loggingSystem: LoggingSystem;
  private readonly configService: ConfigService;
  private nodeManager: NodeManager;
  private loggingConfigSubscription?: Subscription;

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    private readonly env: Env,
    private readonly nodeInfo: NodeInfo,
    private readonly onShutdown?: (reason?: Error | string) => void
  ) {
    this.loggingSystem = new LoggingSystem(this.nodeInfo);
    this.logger = this.loggingSystem.asLoggerFactory();
    this.configService = new ConfigService(rawConfigProvider, this.env, this.logger);

    this.log = this.logger.get('node', 'coordinator');
    this.nodeManager = new NodeManager(this.configService, this.logger, this.log);
  }

  async setup() {
    try {
      this.log.debug(`Setting up KibanaCoordinator: ${JSON.stringify(this.nodeInfo)}`);
      setupCoreConfig(this.configService);
      await this.configService.validate();
      await this.nodeManager.setup();
      await this.setupLogging();
    } catch (e) {
      await this.shutdown(e);
      throw e;
    }
  }

  async start() {
    this.log.debug('Starting KibanaCoordinator');
    // nothing for now
  }

  async shutdown(reason?: Error) {
    this.log.debug('Stopping KibanaCoordinator');

    if (reason) {
      this.log.fatal(reason);
    }

    await this.nodeManager.stopWorkers();

    if (this.loggingConfigSubscription !== undefined) {
      this.loggingConfigSubscription.unsubscribe();
      this.loggingConfigSubscription = undefined;
    }
    await this.loggingSystem.stop();

    if (this.onShutdown) {
      this.onShutdown(reason);
    }
  }

  private async setupLogging() {
    // Stream that maps config updates to logger updates, including update failures.
    const update$ = this.configService.getConfig$().pipe(
      // always read the logging config when the underlying config object is re-read
      // except for the CLI process where we only apply the default logging config once
      switchMap(() => this.configService.atPath<LoggingConfigType>('logging')),
      concatMap((config) => this.loggingSystem.upgrade(config)),
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

  reloadLoggingConfig() {
    // TODO: broadcast to all workers
    this.nodeManager.broadcast({
      _kind: 'kibana-broadcast',
      type: 'reload-logging-config',
    });
  }
}
