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
import type { Appender, Logger, LogLevelId, LogMeta, LogRecord } from '@kbn/logging';
import { AbstractLogger, PatternLayout, getLoggerContext } from '@kbn/core-logging-common-internal';
import { toEcsLog } from '@kbn/logging-ecs';

/**
 * Writes up to PIPE_BUF bytes to a pipe are atomic on Linux, so a worker log line
 * of at most this size (newline included) is written whole or not at all.
 */
const MAX_LOG_LINE_BYTES = 4096;
const TRUNCATED_SUFFIX = ' [truncated]';
const MAX_TRUNCATION_ATTEMPTS = 3;

/** Logging settings a worker resolves once at spawn time. */
export interface WorkerLoggingConfig {
  readonly context: string;
  readonly level: LogLevelId;
  /** Undefined disables the worker's console output. */
  readonly format?: 'json' | 'text';
  /** Service fields that never change after startup, added to every log line. */
  readonly service: {
    readonly node: { readonly roles: readonly string[] };
    readonly version: string;
    readonly type: string;
  };
}

/** A logger that writes straight to a file descriptor and counts the log lines it lost. */
export interface WorkerLogger extends Logger {
  /** Running total of log lines lost to write failures, partial writes or formatting errors. */
  getDroppedLogLineCount(): number;
}

interface WorkerMarker {
  readonly name: string;
  readonly thread_id: number;
}

interface WorkerLogSink extends Appender {
  getDroppedLogLineCount(): number;
}

const createWorkerLogSink = (
  config: WorkerLoggingConfig,
  marker: WorkerMarker | undefined,
  outputFd: number
): WorkerLogSink => {
  const pattern = new PatternLayout();
  let droppedLogLines = 0;
  let needsNewline = false;

  const format = (record: LogRecord, meta: LogMeta | undefined): string => {
    const mergedMeta = merge(
      { service: config.service },
      meta ?? {},
      marker ? { kibana: { worker: marker } } : {}
    );
    const markedRecord: LogRecord = { ...record, meta: mergedMeta };

    if (config.format === 'json') {
      return JSON.stringify(toEcsLog(markedRecord, process.uptime()));
    }
    return pattern.format({
      ...markedRecord,
      message: marker
        ? `[worker:${marker.name}:${marker.thread_id}] ${markedRecord.message}`
        : markedRecord.message,
    });
  };

  const formatWithinLimit = (record: LogRecord): string | undefined => {
    const line = format(record, record.meta);
    // One byte is kept for the newline, and one for the newline that may end a cut-off log line.
    const maxBytes = MAX_LOG_LINE_BYTES - 2;
    if (Buffer.byteLength(line) <= maxBytes) {
      return line;
    }

    // Too long: keep the service fields and the marker, drop the log line's own data,
    // and cut the message until the log line fits.
    let messageBytes = Buffer.byteLength(record.message);
    for (let attempt = 0; attempt < MAX_TRUNCATION_ATTEMPTS; attempt++) {
      const truncated = format(
        {
          ...record,
          error: undefined,
          message: `${truncateToBytes(record.message, messageBytes)}${TRUNCATED_SUFFIX}`,
        },
        undefined
      );
      const overflow = Buffer.byteLength(truncated) - maxBytes;
      if (overflow <= 0) {
        return truncated;
      }
      messageBytes = Math.max(0, messageBytes - overflow);
    }
    return undefined;
  };

  const write = (line: string): void => {
    // After a partial write, end the cut-off log line first so the next one stays whole.
    const payload = Buffer.from(`${needsNewline ? '\n' : ''}${line}\n`);
    // When stdout is a pipe, Node makes fd 1 non-blocking once it sets up process.stdout, so a
    // full pipe throws EAGAIN (and a closed one EPIPE) instead of blocking the worker. A TTY or a
    // file stays blocking, so a stalled terminal or disk can pause the worker here.
    const written = writeSync(outputFd, payload);
    if (written < payload.length) {
      needsNewline = true;
      // Only the trailing newline is missing: the log line itself arrived, and the next
      // write's leading newline ends it.
      if (written < payload.length - 1) {
        droppedLogLines++;
      }
      return;
    }
    needsNewline = false;
  };

  return {
    getDroppedLogLineCount: () => droppedLogLines,
    append: (record) => {
      try {
        const line = formatWithinLimit(record);
        if (line === undefined) {
          droppedLogLines++;
          return;
        }
        write(line);
      } catch {
        // Logging must never crash the worker.
        droppedLogLines++;
      }
    },
  };
};

const isUtf8ContinuationByte = (byte: number): boolean => byte >= 0x80 && byte < 0xc0;

const truncateToBytes = (value: string, maxBytes: number): string => {
  const buffer = Buffer.from(value);
  if (buffer.length <= maxBytes) {
    return value;
  }
  // Back off to the start of a character so a multi-byte character isn't cut in half.
  let end = maxBytes;
  while (end > 0 && isUtf8ContinuationByte(buffer[end])) {
    end--;
  }
  return buffer.subarray(0, end).toString('utf8');
};

class WorkerLoggerImpl extends AbstractLogger implements WorkerLogger {
  constructor(
    context: string,
    level: LogLevel,
    private readonly sink: WorkerLogSink,
    getChild: (context: string) => WorkerLogger
  ) {
    // AbstractLogger.get passes the parent context first.
    super(context, level, [sink], {
      get: (...contextParts) => getChild(getLoggerContext(contextParts)),
    });
  }

  public getDroppedLogLineCount(): number {
    return this.sink.getDroppedLogLineCount();
  }

  protected createLogRecord<Meta extends LogMeta>(
    level: LogLevel,
    errorOrMessage: string | Error,
    meta?: Meta
  ): LogRecord {
    const isError = errorOrMessage instanceof Error;
    return {
      timestamp: new Date(),
      pid: process.pid,
      context: this.context,
      level,
      message: isError ? errorOrMessage.message : errorOrMessage,
      error: isError ? errorOrMessage : undefined,
      meta,
    };
  }
}

/** Creates a logger that writes synchronously to `outputFd`, independent of the main thread. */
export const createWorkerLogger = (
  config: WorkerLoggingConfig,
  name: string,
  outputFd: number = 1
): WorkerLogger => {
  const marker = isMainThread ? undefined : { name, thread_id: threadId };
  const sink = createWorkerLogSink(config, marker, outputFd);
  const level = LogLevel.fromId(config.format ? config.level : 'off');

  const create = (context: string): WorkerLogger =>
    new WorkerLoggerImpl(context, level, sink, create);

  return create(config.context);
};
