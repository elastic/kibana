import { Logger, LogMeta } from './Logger';
import { LogRecord } from './LogRecord';

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
