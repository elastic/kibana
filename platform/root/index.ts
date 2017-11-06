import { Observable } from '@elastic/kbn-observable';

import { Server } from '../server';
import { ConfigService, Env, RawConfig } from '../config';

import { Logger } from '../logging/Logger';
import { LoggingService } from '../logging/LoggingService';
import { LoggerFactory, MutableLoggerFactory } from '../logging/LoggerFactory';
import { LoggingConfig } from '../logging/LoggingConfig';

export type OnShutdown = (reason?: Error) => void;

/**
 * Top-level entry point to kick off the app and start the Kibana server.
 */
export class Root {
  configService: ConfigService;
  server?: Server;
  readonly log: Logger;
  readonly logger: LoggerFactory;
  private readonly loggingService: LoggingService;

  constructor(
    rawConfig$: Observable<RawConfig>,
    private readonly env: Env,
    private readonly onShutdown: OnShutdown = () => {}
  ) {
    const loggerFactory = new MutableLoggerFactory(env);
    this.loggingService = new LoggingService(loggerFactory);
    this.logger = loggerFactory;

    this.log = this.logger.get('root');
    this.configService = new ConfigService(rawConfig$, env, this.logger);
  }

  async start() {
    try {
      const loggingConfig$ = this.configService.atPath(
        'logging',
        LoggingConfig
      );
      this.loggingService.upgrade(loggingConfig$);
    } catch (e) {
      // This specifically console.logs because we were not able to configure
      // the logger.
      console.error('Configuring logger failed:', e.message);

      await this.shutdown(e);
      throw e;
    }

    this.log.info('starting the server');

    this.server = new Server(this.configService, this.logger, this.env);

    try {
      await this.server.start();
    } catch (e) {
      this.log.error(e);

      await this.shutdown(e);
      throw e;
    }
  }

  async shutdown(reason?: Error) {
    this.log.info('stopping Kibana');
    if (this.server !== undefined) {
      await this.server.stop();
    }

    await this.loggingService.stop();

    this.onShutdown(reason);
  }
}
