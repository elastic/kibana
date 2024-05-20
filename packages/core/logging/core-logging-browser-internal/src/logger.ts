/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { LogLevel, LogRecord, LogMeta } from '@kbn/logging';
import { AbstractLogger } from '@kbn/core-logging-common-internal';

function isError(x: any): x is Error {
  return x instanceof Error;
}

export const BROWSER_PID = -1;

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
        pid: BROWSER_PID,
      };
    }

    return {
      context: this.context,
      level,
      message: errorOrMessage,
      meta,
      timestamp: new Date(),
      pid: BROWSER_PID,
    };
  }
}
