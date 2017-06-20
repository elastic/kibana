import { Level } from './Level';
import { LoggerConfig } from './LoggerConfig';
import { Logger, LoggerAdapter } from './LoggerAdapter';
import { createLoggerFromConfig, defaultLogger, EventLogger } from './EventLogger/index';

export interface LoggerFactory {
  get(...namespace: string[]): Logger;
}

export interface MutableLogger {
  updateLogger(logger: LoggerConfig): void;
  close(): void;
}

// # Mutable Logger Factory
//
// Performs two tasks:
//
// 1. Holds on to (and updates) the currently active `EventLogger`, aka the
//    implementation that receives log events and performs the logging (e.g.
//    Bunyan or Winston.)
// 2. Creates namespaced `LoggerAdapter`s (the log interface used in the app)
//    and triggers updates on them whenever a new `LoggerConfig` is received.
//
// This `LoggerFactory` needs to be mutable as it's a singleton in the app, so
// it can be `import`-ed anywhere in the app instead of being injected everywhere.

export class MutableLoggerFactory implements MutableLogger, LoggerFactory {

  private logger: EventLogger = defaultLogger;
  private level: Level = Level.Debug;

  // The cache of namespaced `LoggerAdapter`s
  private readonly loggerByContext: {
    [namespace: string]: LoggerAdapter
  } = {};

  get(...namespace: string[]): Logger {
    const context = namespace.join('.');

    if (this.loggerByContext[context] === undefined) {
      this.loggerByContext[context] = new LoggerAdapter(namespace, this.logger, this.level);
    }

    return this.loggerByContext[context];
  }

  updateLogger(config: LoggerConfig) {
    const logger = this.createOrUpdateLogger(config)
    const level = config.getLevel();

    this.level = level;
    this.logger = logger;

    Object.values(this.loggerByContext).forEach(loggerAdapter => {
      loggerAdapter.update(logger, level);
    })
  }

  private createOrUpdateLogger(config: LoggerConfig) {
    // TODO Check if type is different, then switch
    if (this.logger === defaultLogger) {
      this.logger.close();
      return createLoggerFromConfig(config);
    }

    this.logger.update(config);
    return this.logger;
  }

  close(): void {
    for (const key in this.loggerByContext) {
      delete this.loggerByContext[key];
    }

    this.logger.close();
  }
}