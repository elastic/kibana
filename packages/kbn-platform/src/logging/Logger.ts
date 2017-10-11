import { Appender } from './appenders/Appenders';
import { LogLevel } from './LogLevel';
import { LogRecord } from './LogRecord';

/**
 * Logger exposes all the necessary methods to log any type of information and
 * this is the interface used by the logging consumers including plugins.
 */
export interface Logger {
  trace(message: string, meta?: { [key: string]: any }): void;
  debug(message: string, meta?: { [key: string]: any }): void;
  info(message: string, meta?: { [key: string]: any }): void;
  warn(errorOrMessage: string | Error, meta?: { [key: string]: any }): void;
  error(errorOrMessage: string | Error, meta?: { [key: string]: any }): void;
  fatal(errorOrMessage: string | Error, meta?: { [key: string]: any }): void;

  /** @internal */
  log(record: LogRecord): void;
}

/** @internal */
export class BaseLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly level: LogLevel,
    private readonly appenders: Appender[]
  ) {}

  trace(message: string, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Trace, message, meta));
  }

  debug(message: string, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Debug, message, meta));
  }

  info(message: string, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Info, message, meta));
  }

  warn(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Warn, errorOrMessage, meta));
  }

  error(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Error, errorOrMessage, meta));
  }

  fatal(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.log(this.createLogRecord(LogLevel.Fatal, errorOrMessage, meta));
  }

  log(record: LogRecord) {
    if (!this.level.supports(record.level)) {
      return;
    }

    for (const appender of this.appenders) {
      appender.append(record);
    }
  }

  private createLogRecord(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: { [key: string]: any }
  ): LogRecord {
    const isError = errorOrMessage instanceof Error;
    return {
      timestamp: new Date(),
      level,
      context: this.context,
      message: isError
        ? (errorOrMessage as Error).message
        : errorOrMessage as string,
      error: isError ? errorOrMessage as Error : undefined,
      meta
    };
  }
}

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(public logger: Logger) {}

  trace(message: string, meta?: { [key: string]: any }): void {
    this.logger.trace(message, meta);
  }

  debug(message: string, meta?: { [key: string]: any }): void {
    this.logger.debug(message, meta);
  }

  info(message: string, meta?: { [key: string]: any }): void {
    this.logger.info(message, meta);
  }

  warn(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.logger.warn(errorOrMessage, meta);
  }

  error(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.logger.error(errorOrMessage, meta);
  }

  fatal(errorOrMessage: string | Error, meta?: { [key: string]: any }): void {
    this.logger.fatal(errorOrMessage, meta);
  }

  log(record: LogRecord) {
    this.logger.log(record);
  }
}
