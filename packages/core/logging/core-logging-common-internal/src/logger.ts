/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  Appender,
  LogLevel,
  LogRecord,
  LoggerFactory,
  LogMeta,
  Logger,
  LogLevelId,
} from '@kbn/logging';

/**
 * @internal
 */
export type CreateLogRecordFn = <Meta extends LogMeta>(
  level: LogLevel,
  errorOrMessage: string | Error,
  meta?: Meta
) => LogRecord;

/**
 * A basic, abstract logger implementation that delegates the create of log records to the child's createLogRecord function.
 * @internal
 */
export abstract class AbstractLogger implements Logger {
  constructor(
    protected readonly context: string,
    protected readonly level: LogLevel,
    protected readonly appenders: Appender[],
    protected readonly factory: LoggerFactory
  ) {}

  protected abstract createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: Meta
  ): LogRecord;

  public trace<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Trace, message, meta));
  }

  public debug<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Debug, message, meta));
  }

  public info<Meta extends LogMeta = LogMeta>(message: string, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Info, message, meta));
  }

  public warn<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Warn, errorOrMessage, meta));
  }

  public error<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Error, errorOrMessage, meta));
  }

  public fatal<Meta extends LogMeta = LogMeta>(errorOrMessage: string | Error, meta?: Meta): void {
    this.log(this.createLogRecord<Meta>(LogLevel.Fatal, errorOrMessage, meta));
  }

  public isLevelEnabled(levelId: LogLevelId): boolean {
    return this.level.supports(LogLevel.fromId(levelId));
  }

  public log(record: LogRecord) {
    if (!this.level.supports(record.level)) {
      return;
    }
    for (const appender of this.appenders) {
      appender.append(record);
    }
  }

  public get(...childContextPaths: string[]): Logger {
    return this.factory.get(...[this.context, ...childContextPaths]);
  }
}
