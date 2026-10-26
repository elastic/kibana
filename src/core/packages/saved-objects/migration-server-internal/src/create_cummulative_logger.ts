/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LogLevelId, LogMessageSource, LogMeta, LogRecord } from '@kbn/logging';
import type { MigrationLog } from './types';

export function createCummulativeLogger(
  logger: Logger
): Logger & { dump: () => void; clear: () => void } {
  const migrationLogs: MigrationLog[] = [];

  return {
    debug<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
      logger.debug<Meta>(message, meta);
    },
    trace<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
      logger.trace<Meta>(message, meta);
    },
    fatal<Meta extends LogMeta = LogMeta>(message: LogMessageSource, meta?: Meta) {
      logger.fatal<Meta>(message, meta);
    },
    log(record: LogRecord) {
      logger.log(record);
    },
    isLevelEnabled(level: LogLevelId): boolean {
      return logger.isLevelEnabled(level);
    },
    clear(): void {
      migrationLogs.length = 0;
    },
    dump(): void {
      migrationLogs.forEach((log) => {
        const level = log.level === 'warning' ? 'warn' : log.level;
        logger[level](log.message);
      });
    },
    error(errorOrMessage: LogMessageSource | Error): void {
      migrationLogs.push({
        level: 'error',
        message: errorOrMessage.toString(),
      });
    },
    get(...childContextPaths: string[]): Logger {
      return createCummulativeLogger(logger.get(...childContextPaths));
    },
    info(message: LogMessageSource): void {
      migrationLogs.push({
        level: 'info',
        message: message.toString(),
      });
    },
    warn(errorOrMessage: LogMessageSource | Error): void {
      migrationLogs.push({
        level: 'warning',
        message: errorOrMessage.toString(),
      });
    },
  };
}
