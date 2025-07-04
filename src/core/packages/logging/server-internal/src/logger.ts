/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import apmAgent from 'elastic-apm-node';
import { LogLevel, LogRecord, LogMeta } from '@kbn/logging';
import { AbstractLogger } from '@kbn/core-logging-common-internal';

function isError(x: any): x is Error {
  return x instanceof Error;
}

/** @internal */
export class BaseLogger extends AbstractLogger {
  protected createLogRecord<Meta extends LogMeta>(
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
