/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Appender, LogLevel, LogRecord, LoggerFactory, LogMeta, Logger } from '@kbn/logging';

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** @internal */
export class BaseLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly level: LogLevel,
    private readonly appenders: Appender[],
    private readonly factory: LoggerFactory
  ) {}

  public trace(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Trace, message, meta));
  }

  public debug(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Debug, message, meta));
  }

  public info(message: string, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Info, message, meta));
  }

  public warn(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Warn, errorOrMessage, meta));
  }

  public error(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Error, errorOrMessage, meta));
  }

  public fatal(errorOrMessage: string | Error, meta?: LogMeta): void {
    this.log(this.createLogRecord(LogLevel.Fatal, errorOrMessage, meta));
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

  private createLogRecord(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: LogMeta
  ): LogRecord {
    if (isError(errorOrMessage)) {
      return {
        context: this.context,
        error: errorOrMessage,
        level,
        message: errorOrMessage.message,
        meta,
        timestamp: new Date(),
        pid: process.pid,
      };
    }

    return {
      context: this.context,
      level,
      message: errorOrMessage,
      meta,
      timestamp: new Date(),
      pid: process.pid,
    };
  }
}
