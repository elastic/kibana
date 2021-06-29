/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Logger, LoggerFactory } from '@kbn/logging';
import { Env, RawConfigurationProvider, ConfigService } from '@kbn/config';
import { LoggingSystem } from '../logging';
import { NodeManager, NodeInfo, nodeConfig } from '../node';
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

  constructor(
    rawConfigProvider: RawConfigurationProvider,
    private readonly env: Env,
    private readonly nodeInfo: NodeInfo,
    private readonly onShutdown?: (reason?: Error | string) => void
  ) {
    this.loggingSystem = new LoggingSystem();
    this.logger = this.loggingSystem.asLoggerFactory();
    this.configService = new ConfigService(rawConfigProvider, this.env, this.logger);

    this.log = this.logger.get('root.node.coordinator');
    this.nodeManager = new NodeManager(this.configService, this.logger);
  }

  async setup() {
    this.log.debug(`Setting up KibanaCoordinator: JSON.stringify(${this.nodeInfo})`);
    this.configService.setSchema(nodeConfig.path, nodeConfig.schema);
    await this.configService.validate();
    await this.nodeManager.setup();
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

    if (this.onShutdown) {
      this.onShutdown(reason);
    }
  }

  reloadLoggingConfig() {
    // TODO: broadcast to all workers
    this.nodeManager.broadcast({
      _kind: 'kibana-broadcast',
      type: 'reload-logging-config',
    });
  }
}
