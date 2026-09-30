/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { writeSync } from 'node:fs';
import { isMainThread, threadId } from 'node:worker_threads';
import { merge } from '@kbn/std';
import { LogLevel } from '@kbn/logging';
import type { Logger, LogLevelId, LogMeta, LogRecord } from '@kbn/logging';
import { AbstractLogger, PatternLayout, toEcsLog } from '@kbn/core-logging-common-internal';

export interface WorkerLoggingConfig {
  context: string;
  level: LogLevelId;
  /** Undefined disables the independent console sink. */
  format?: 'json' | 'text';
}

class DiagnosticLogger extends AbstractLogger {
  protected createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    message: string | Error,
    meta?: Meta
  ): LogRecord {
    return {
      timestamp: new Date(),
      pid: process.pid,
      context: this.context,
      level,
      message: message instanceof Error ? message.message : message,
      error: message instanceof Error ? message : undefined,
      meta,
    };
  }
}

/** Creates a standard logger with a best-effort synchronous sink independent of the main event loop. */
export const createWorkerLogger = (
  config: WorkerLoggingConfig,
  name: string,
  outputFd: number = 1
): Logger => {
  const pattern = new PatternLayout();
  const marker = isMainThread ? undefined : { name, thread_id: threadId };
  return new DiagnosticLogger(
    config.context,
    LogLevel.fromId(config.format ? config.level : 'off'),
    [
      {
        append: (record) => {
          if (!config.format) return;
          try {
            const markedRecord = {
              ...record,
              meta: marker ? merge(record.meta ?? {}, { kibana: { worker: marker } }) : record.meta,
            };
            const line =
              config.format === 'json'
                ? JSON.stringify(toEcsLog(markedRecord, process.uptime()))
                : pattern.format({
                    ...markedRecord,
                    message: marker
                      ? `[worker:${marker.name}:${marker.thread_id}] ${record.message}`
                      : record.message,
                  });
            writeSync(outputFd, `${line}\n`);
          } catch {
            // Diagnostics must not crash the worker if formatting or the output sink fails.
          }
        },
      },
    ],
    {
      get: (...context) =>
        createWorkerLogger({ ...config, context: context.join('.') }, name, outputFd),
    }
  );
};
