import { Logger, LogMeta } from './Logger';
import { LogRecord } from './LogRecord';

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private _logger: Logger) {}

  /**
   * The current logger can be updated "on the fly", e.g. when the log config
   * has changed.
   *
   * This is not intended for external use, only internally in Kibana
   *
   * @internal
   */
  updateLogger(logger: Logger) {
    this._logger = logger;
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
