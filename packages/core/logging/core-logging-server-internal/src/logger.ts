/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import apmAgent from 'elastic-apm-node';
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

  private createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: Meta
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
        ...this.getTraceIds(),
      };
    }

    return {
      context: this.context,
      level,
      message: errorOrMessage,
      meta,
      timestamp: new Date(),
      pid: process.pid,
      ...this.getTraceIds(),
    };
  }

  private getTraceIds() {
    return {
      spanId: apmAgent.currentTraceIds['span.id'],
      traceId: apmAgent.currentTraceIds['trace.id'],
      transactionId: apmAgent.currentTraceIds['transaction.id'],
    };
  }
}
