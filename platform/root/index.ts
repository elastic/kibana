import { Server } from '../server';
import { ConfigService, Env } from '../config';
import { LoggerService, Logger, LoggerFactory, LoggerConfig, MutableLoggerFactory } from '../logger';

// Top-level entry point to kick off the app

export class Root {
  configService: ConfigService;
  server?: Server;
  log: Logger;
  logger: LoggerFactory;

  loggerService: LoggerService;

  constructor(
    argv: {[key: string]: any},
    env: Env
  ) {
    const loggerFactory = new MutableLoggerFactory();
    this.loggerService = new LoggerService(loggerFactory);
    this.logger = loggerFactory;

    this.log = this.logger.get('root');
    this.configService = new ConfigService(argv, env, this.logger);
  }

  async start() {
    this.configService.start();

    const loggingConfig$ = this.configService.atPath(
      'logging',
      LoggerConfig
    );

    this.loggerService.upgrade(loggingConfig$);

    this.log.info('starting the server');

    this.server = new Server(this.configService, this.logger);

    try {
      await this.server.start();
    } catch(e) {
      this.log.error(e);
      this.shutdown();
    }
  }

  reloadConfig() {
    this.configService.reloadConfig();
  }

  // TODO Accept `string | Error` reason for shutdown?
  shutdown() {
    this.log.info('stopping Kibana');
    if (this.server !== undefined) {
      this.server.stop();
    }
    this.configService.stop();
    this.loggerService.stop();

    // TODO Should this be moved to cli?
    process.exit(0);
  }
}
