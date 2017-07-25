import { Observable } from 'rxjs';

import { Server } from '../server';
import { ConfigService, Env } from '../config';
import {
  LoggerService,
  Logger,
  LoggerFactory,
  LoggerConfig,
  MutableLoggerFactory
} from '../logger';

export type OnShutdown = (reason?: Error) => void;

/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export class Root {
  configService: ConfigService;
  server?: Server;
  log: Logger;
  logger: LoggerFactory;
  loggerService: LoggerService;

  constructor(
    rawConfig$: Observable<{ [key: string]: any }>,
    env: Env,
    private readonly onShutdown: OnShutdown
  ) {
    const loggerFactory = new MutableLoggerFactory();
    this.loggerService = new LoggerService(loggerFactory);
    this.logger = loggerFactory;

    this.log = this.logger.get('root');
    this.configService = new ConfigService(rawConfig$, env, this.logger);
  }

  async start() {
    try {
      const loggingConfig$ = this.configService.atPath('logging', LoggerConfig);
      this.loggerService.upgrade(loggingConfig$);
    } catch (e) {
      // This specifically console.logs because we were not able to configure
      // the logger.
      console.error('Configuring logger failed:', e.message);
      return this.shutdown(e);
    }

    this.log.info('starting the server');

    this.server = new Server(this.configService, this.logger);

    try {
      await this.server.start();
    } catch (e) {
      this.log.error(e);
      return this.shutdown(e);
    }
  }

  async shutdown(reason?: Error) {
    this.log.info('stopping Kibana');
    if (this.server !== undefined) {
      await this.server.stop();
    }
    this.loggerService.stop();

    this.onShutdown(reason);
  }
}
