/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, LoggerFactory } from '@kbn/logging';
import { Subscription } from 'rxjs';
import { Env, RawConfigurationProvider, ConfigService } from '@kbn/config';
import { LoggingSystem } from '../logging';
import { ClusterManager, ClusteringInfo, clusteringConfig } from '../clustering';
import { KibanaRoot } from './types';

/**
 * Root class for the Kibana coordinator in clustering mode
 */
export class KibanaCoordinator implements KibanaRoot {
  public readonly logger: LoggerFactory;
  private readonly log: Logger;
  private readonly loggingSystem: LoggingSystem;
  private readonly configService: ConfigService;
  private clusterManager: ClusterManager;
  private loggingConfigSubscription?: Subscription;

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    private readonly env: Env,
    private readonly clusteringInfo: ClusteringInfo,
    private readonly onShutdown?: (reason?: Error | string) => void
  ) {
    this.loggingSystem = new LoggingSystem();
    this.logger = this.loggingSystem.asLoggerFactory();
    this.configService = new ConfigService(rawConfigProvider, env, this.logger);

    this.log = this.logger.get('root');
    this.clusterManager = new ClusterManager(this.configService, this.logger);
  }

  async setup() {
    this.configService.setSchema(clusteringConfig.path, clusteringConfig.schema);
    await this.configService.validate();
    await this.clusterManager.setup();
  }

  async start() {
    // nothing for now
  }

  async shutdown(reason?: Error) {
    if (reason) {
      this.log.fatal(reason);
    }

    await this.clusterManager.stopWorkers();

    if (this.onShutdown) {
      this.onShutdown(reason);
    }
  }

  reloadLoggingConfig() {
    // TODO: broadcast to all workers
    this.clusterManager.broadcast({
      _kind: 'kibana-broadcast',
      type: 'reload-logging-config',
    });
  }
}
