/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Writer } from '@kbn/tooling-log';
import { ToolingLog } from '@kbn/tooling-log';
import { logPerf } from './log_perf';

export enum LogLevel {
  verbose = 'verbose',
  debug = 'debug',
  info = 'info',
  warn = 'warning',
  error = 'error',
}

export function extendToolingLog(log: ToolingLog, logLevel: LogLevel = LogLevel.verbose): Logger {
  const logger = log as Logger;
  logger.perf = (name: string, callback: () => any) => {
    return logPerf(log, LogLevel.verbose, name, callback);
  };

  return logger;
}

export function createLogger(logLevel: LogLevel, writer?: Writer): Logger {
  const log = new ToolingLog({
    level: logLevel,
    writeTo: writer ? { write: () => true } : process.stdout,
  }) as Logger;

  if (writer) {
    log.setWriters([writer]);
  }

  extendToolingLog(log, logLevel);

  return log;
}

export type Logger = ToolingLog & {
  perf: <T>(name: string, cb: () => T) => T;
};
