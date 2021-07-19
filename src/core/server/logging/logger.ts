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
  SerializableLogRecord,
} from '@kbn/logging';
import { NodeInfo } from '../node';

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** @internal */
export class BaseLogger implements Logger {
  constructor(
    private readonly context: string,
    private readonly level: LogLevel,
    private readonly appenders: Appender[],
    private readonly factory: LoggerFactory,
    private readonly nodeInfo: NodeInfo
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

    if (this.nodeInfo.isEnabled && !this.nodeInfo.isCoordinator) {
      // If we are in clustering mode, and this is a worker,
      // send to the coordinator instead of appending.
      process.send!({
        _kind: 'kibana-log-record',
        payload: BaseLogger.toSerializableLogRecord(record),
        workerId: this.nodeInfo.workerId,
      });
    } else {
      // We are the coordinator or in non-clustering mode,
      // so just append the record.
      this.append(record);
    }
  }

  public get(...childContextPaths: string[]): Logger {
    return this.factory.get(...[this.context, ...childContextPaths]);
  }

  private append(record: LogRecord) {
    for (const appender of this.appenders) {
      appender.append(record);
    }
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

  /**
   * If clustering is enabled, we need to be able to serialize a LogRecord
   * so that it can be sent to the coordinator process via IPC.
   *
   * Converting each record to and from the serializable format is potentially
   * expensive; ideally we'd consider changing the `LogRecord` interface into
   * something fully serializable. Would need to assess how much impact this
   * could have on the rest of Kibana.
   */
  public static toSerializableLogRecord(record: LogRecord): SerializableLogRecord {
    return {
      ...record, // TODO: shallow clone might not be necessary
      level: record.level.id,
      timestamp:
        typeof record.timestamp === 'string' ? record.timestamp : record.timestamp.toISOString(),
      error: record.error
        ? {
            message: record.error.message,
            name: record.error.name,
            stack: record.error.stack,
          }
        : undefined,
    };
  }

  public static fromSerializableLogRecord(record: SerializableLogRecord): LogRecord {
    const error = record.error ? new Error(record.error.message) : undefined;
    if (error) {
      error.name = record.error!.name;
      error.stack = record.error?.stack;
    }

    return {
      ...record, // TODO: shallow clone might not be necessary
      level: LogLevel.fromId(record.level),
      timestamp: new Date(record.timestamp),
      error,
    };
  }
}
