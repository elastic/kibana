/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogRecord, Logger, LogMeta, LogLevelId } from '@kbn/logging';
import { GlobalContext, mergeGlobalContext } from './global_context';

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private logger: Logger, private globalContext: GlobalContext = {}) {}

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

  /**
   * The current record of {@link GlobalContext} that can be updated on the fly.
   * Any updates via this method will be applied to all subsequent log entries.
   *
   * This is not intended for external use, only internally in Kibana
   *
   * @internal
   */
  public updateGlobalContext(context: GlobalContext) {
    this.globalContext = context;
  }

  public trace(message: string, meta?: LogMeta): void {
    this.logger.trace(message, mergeGlobalContext(this.globalContext, meta));
  }

  public debug(message: string, meta?: LogMeta): void {
    this.logger.debug(message, mergeGlobalContext(this.globalContext, meta));
  }

  public info(message: string, meta?: LogMeta): void {
    this.logger.info(message, mergeGlobalContext(this.globalContext, meta));
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.warn(errorOrMessage, mergeGlobalContext(this.globalContext, meta));
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.error(errorOrMessage, mergeGlobalContext(this.globalContext, meta));
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.fatal(errorOrMessage, mergeGlobalContext(this.globalContext, meta));
  }

  public log(record: LogRecord) {
    this.logger.log({ ...record, meta: mergeGlobalContext(this.globalContext, record.meta) });
  }

  public isLevelEnabled(level: LogLevelId): boolean {
    return this.logger.isLevelEnabled(level);
  }

  public get(...contextParts: string[]): Logger {
    return this.logger.get(...contextParts);
  }
}
