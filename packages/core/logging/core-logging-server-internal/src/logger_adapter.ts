/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { has } from 'lodash';
import { set } from '@elastic/safer-lodash-set';
import { LogRecord, Logger, LogMeta } from '@kbn/logging';

/** @internal */
export type GlobalMeta = Map<string, unknown>;

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(private logger: Logger, private globalMeta: GlobalMeta = new Map()) {}

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
   * The current map of {@link GlobalMeta} that can be updated on the fly.
   * Any updates via this method will be applied to all subsequent log entries.
   *
   * This is not intended for external use, only internally in Kibana
   *
   * @internal
   */
  public setGlobalMeta(meta: GlobalMeta) {
    this.globalMeta = meta;
  }

  public trace(message: string, meta?: LogMeta): void {
    this.logger.trace(message, this.mergeGlobalMeta(meta));
  }

  public debug(message: string, meta?: LogMeta): void {
    this.logger.debug(message, this.mergeGlobalMeta(meta));
  }

  public info(message: string, meta?: LogMeta): void {
    this.logger.info(message, this.mergeGlobalMeta(meta));
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.warn(errorOrMessage, this.mergeGlobalMeta(meta));
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.error(errorOrMessage, this.mergeGlobalMeta(meta));
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.logger.fatal(errorOrMessage, this.mergeGlobalMeta(meta));
  }

  public log(record: LogRecord) {
    this.logger.log({ ...record, meta: this.mergeGlobalMeta(record.meta) });
  }

  public get(...contextParts: string[]): Logger {
    return this.logger.get(...contextParts);
  }

  private mergeGlobalMeta(meta?: LogMeta) {
    if (!meta && this.globalMeta.size === 0) {
      return;
    }

    const mergedMeta = meta ?? {};
    for (const [path, data] of this.globalMeta.entries()) {
      if (!has(mergedMeta, path)) {
        set(mergedMeta, path, data);
      }
    }

    return mergedMeta;
  }
}
