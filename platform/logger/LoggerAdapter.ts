import { EventLogger } from './EventLogger';
import { Level } from './Level';

// This is the logger interface that will be available.

// TODO Should implement LoggerFactory so it's possible to `get` a "deeper
// logger" that builds on the context.
export interface Logger {
  trace(message: string, meta?: {[key: string]: any }): void;
  debug(message: string, meta?: {[key: string]: any }): void;
  info(message: string, meta?: {[key: string]: any }): void;
  warn(errorOrMessage: string | Error, meta?: {[key: string]: any }): void;
  error(errorOrMessage: string | Error, meta?: {[key: string]: any }): void;
  fatal(errorOrMessage: string | Error, meta?: {[key: string]: any }): void;
}

export class LoggerAdapter implements Logger {
  constructor(
    private readonly namespace: string[],
    private logger?: EventLogger,
    private level?: Level
  ) {}

  update(logger: EventLogger, level: Level): void {
    this.logger = logger;
    this.level = level;
  }

  trace(message: string, meta?: {[key: string]: any }): void {
    this.log(Level.Trace, message, meta);
  }

  debug(message: string, meta?: {[key: string]: any }): void {
    this.log(Level.Debug, message, meta);
  }

  info(message: string, meta?: {[key: string]: any }): void {
    this.log(Level.Info, message, meta);
  }

  warn(errorOrMessage: string | Error, meta?: {[key: string]: any }): void {
    this.log(Level.Warn, errorOrMessage, meta);
  }

  error(errorOrMessage: string | Error, meta?: {[key: string]: any }): void {
    this.log(Level.Error, errorOrMessage, meta);
  }

  fatal(errorOrMessage: string | Error, meta?: {[key: string]: any }): void {
    this.log(Level.Fatal, errorOrMessage, meta);
  }

  private log(level: Level, errorOrMessage: string | Error, meta?: {[key: string]: any }): void {
    if (this.logger === undefined || this.level === undefined) {
      throw new Error(`Both logger and level must be specified. Logger was [${this.logger}]. Log level was [${this.level}].`);
    }

    if (!this.level.supports(level)) {
      return;
    }

    const context = this.namespace;
    const timestamp = new Date().toISOString();

    if (errorOrMessage instanceof Error) {
      const message = errorOrMessage.message;
      const error = errorOrMessage;
      this.logger.log({ timestamp, level, context, message, error, meta });
    } else {
      const message = errorOrMessage;
      this.logger.log({ timestamp, level, context, message, meta });
    }
  }
}
