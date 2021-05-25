/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogRecord, Logger, LogMeta } from '@kbn/logging';

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

  public get(...contextParts: string[]): Logger {
    return this.logger.get(...contextParts);
  }
}
