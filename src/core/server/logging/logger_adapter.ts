import { LogRecord } from './log_record';
import { Logger, LogMeta } from './logger';

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private logger: Logger) {}

  /**
   * The current logger can be updated "on the fly", e.g. when the log config
   * has changed.
   *
   * This is not intended for external use, only internally in Kibana
   *
   * @internal
   */
  public updateLogger(logger: Logger) {
    this.logger = logger;
  }

  public trace(message: string, meta?: LogMeta): void {
    this.logger.trace(message, meta);
  }

  public debug(message: string, meta?: LogMeta): void {
    this.logger.debug(message, meta);
  }

  public info(message: string, meta?: LogMeta): void {
    this.logger.info(message, meta);
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.warn(errorOrMessage, meta);
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.error(errorOrMessage, meta);
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.fatal(errorOrMessage, meta);
  }

  public log(record: LogRecord) {
    this.logger.log(record);
  }
}
