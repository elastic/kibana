/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogRecord, Logger, LogMeta, LogLevelId, LogMessageSource } from '@kbn/logging';
import { LogLevel } from '@kbn/logging';
import { AbstractLogger } from '@kbn/core-logging-common-internal';
import type { GlobalContext } from './global_context';
import { mergeGlobalContext } from './global_context';

const LEVEL_BY_METHOD = {
  trace: LogLevel.Trace,
  debug: LogLevel.Debug,
  info: LogLevel.Info,
  warn: LogLevel.Warn,
  error: LogLevel.Error,
  fatal: LogLevel.Fatal,
} as const;

type MessageMethod = 'trace' | 'debug' | 'info';
type ErrorOrMessageMethod = 'warn' | 'error' | 'fatal';

/** @internal */
export class LoggerAdapter implements Logger {
  constructor(
    private logger: Logger,
    private globalContext: GlobalContext = {}
  ) {}

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

  public trace(message: LogMessageSource, meta?: LogMeta): void {
    this.forward('trace', message, meta);
  }

  public debug(message: LogMessageSource, meta?: LogMeta): void {
    this.forward('debug', message, meta);
  }

  public info(message: LogMessageSource, meta?: LogMeta): void {
    this.forward('info', message, meta);
  }

  public warn(errorOrMessage: LogMessageSource | Error, meta?: LogMeta): void {
    this.forward('warn', errorOrMessage, meta);
  }

  public error(errorOrMessage: LogMessageSource | Error, meta?: LogMeta): void {
    this.forward('error', errorOrMessage, meta);
  }

  public fatal(errorOrMessage: LogMessageSource | Error, meta?: LogMeta): void {
    this.forward('fatal', errorOrMessage, meta);
  }

  public log(record: LogRecord) {
    if (record.level && this.isLevelDisabled(record.level)) {
      return;
    }
    this.logger.log({ ...record, meta: mergeGlobalContext(this.globalContext, record.meta) });
  }

  public isLevelEnabled(level: LogLevelId): boolean {
    return this.logger.isLevelEnabled(level);
  }

  public get(...contextParts: string[]): Logger {
    return this.logger.get(...contextParts);
  }

  private isLevelDisabled(level: LogLevel): boolean {
    if (this.logger instanceof AbstractLogger) {
      return !this.logger.isGateLevelEnabled(level);
    }
    return this.logger.isLevelEnabled?.(level.id) === false;
  }

  private forward(method: MessageMethod, message: LogMessageSource, meta?: LogMeta): void;
  private forward(
    method: ErrorOrMessageMethod,
    errorOrMessage: LogMessageSource | Error,
    meta?: LogMeta
  ): void;
  private forward(
    method: MessageMethod | ErrorOrMessageMethod,
    errorOrMessage: LogMessageSource | Error,
    meta?: LogMeta
  ): void {
    if (this.isLevelDisabled(LEVEL_BY_METHOD[method])) {
      return;
    }

    const mergedMeta = mergeGlobalContext(this.globalContext, meta);
    switch (method) {
      case 'trace':
      case 'debug':
      case 'info':
        this.logger[method](errorOrMessage as LogMessageSource, mergedMeta);
        break;
      case 'warn':
      case 'error':
      case 'fatal':
        this.logger[method](errorOrMessage, mergedMeta);
        break;
    }
  }
}
