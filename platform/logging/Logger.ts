import { Appender } from './appenders/Appenders';
import { LogLevel } from './LogLevel';
import { LogRecord } from './LogRecord';

export type LogMeta = { [key: string]: any };

/**
 * Logger exposes all the necessary methods to log any type of information and
 * this is the interface used by the logging consumers including plugins.
 */
export interface Logger {
  trace(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  info(message: string, meta?: LogMeta): void;
  warn(errorOrMessage: string | Error, meta?: LogMeta): void;
  error(errorOrMessage: string | Error, meta?: LogMeta): void;
  fatal(errorOrMessage: string | Error, meta?: LogMeta): void;

  /** @internal */
  log(record: LogRecord): void;
}

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** @internal */
export class BaseLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly level: LogLevel,
    private readonly appenders: Appender[]
  ) {}

  trace(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Trace, message, meta));
  }

  debug(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Debug, message, meta));
  }

  info(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Info, message, meta));
  }

  warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Warn, errorOrMessage, meta));
  }

  error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Error, errorOrMessage, meta));
  }

  fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
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
    meta?: LogMeta
  ): LogRecord {
    const record = {
      timestamp: new Date(),
      level,
      context: this.context,
      meta
    };

    if (isError(errorOrMessage)) {
      return {
        ...record,
        message: errorOrMessage.message,
        error: errorOrMessage
      };
    }

    return {
      ...record,
      message: errorOrMessage,
      error: undefined
    };
  }
}

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private _logger: Logger) {}

  /**
   * The current logger can be updated "on the fly", e.g. when the log config
   * has changed.
   */
  set logger(logger: Logger) {
    this._logger = logger;
  }

  /**
   * The internal logger is not intended as a public api. Instead the log
   * methods should be used.
   *
   * This getter is only added here for clarity, as we have added the setter to
   * update the internal logger.
   */
  get logger() {
    throw new Error(
      'Do not use the internal logger directly, instead use the log methods'
    );
  }

  trace(message: string, meta?: LogMeta): void {
    this._logger.trace(message, meta);
  }

  debug(message: string, meta?: LogMeta): void {
    this._logger.debug(message, meta);
  }

  info(message: string, meta?: LogMeta): void {
    this._logger.info(message, meta);
  }

  warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this._logger.warn(errorOrMessage, meta);
  }

  error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this._logger.error(errorOrMessage, meta);
  }

  fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this._logger.fatal(errorOrMessage, meta);
  }

  log(record: LogRecord) {
    this._logger.log(record);
  }
}
