/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';
import type { WriteStream } from 'fs';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';

import { Layouts } from '../../layouts/layouts';
import { onWriteErrorSchema, toLogFileWriteError } from '../write_error_handler';

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class FileAppender implements DisposableAppender {
  public static configSchema = schema.object({
    type: schema.literal('file'),
    layout: Layouts.configSchema,
    fileName: schema.string(),
  });

  /**
   * {@link FileAppender.configSchema} plus the plugin-only `onWriteError` handler; used only by
   * the {@link LoggingServiceSetup.configure} validation path, never wired into YAML config.
   */
  public static runtimeConfigSchema = FileAppender.configSchema.extends({
    onWriteError: onWriteErrorSchema,
  });

  /**
   * Writable file stream to write formatted `LogRecord` to.
   */
  private outputStream?: WriteStream;
  private readonly reportWriteError?: (error: unknown) => void;

  /**
   * Creates FileAppender instance with specified layout and file path.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   * @param path Path to the file where log records should be stored.
   * @param onWriteError Opts out of crashing the process when the file cannot be written. Ignored
   *   unless it is a function, so a stray YAML value cannot alter the default crash behavior.
   */
  constructor(
    private readonly layout: Layout,
    private readonly path: string,
    onWriteError?: LogFileWriteErrorHandler
  ) {
    this.reportWriteError =
      typeof onWriteError === 'function'
        ? (error) => onWriteError(toLogFileWriteError(error, path))
        : undefined;
  }

  /**
   * Formats specified `record` and writes them to the specified file.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    if (this.outputStream === undefined) {
      this.ensureDirectory(this.path);
      this.outputStream = createWriteStream(this.path, {
        encoding: 'utf8',
        flags: 'a',
      });

      if (this.reportWriteError) {
        this.outputStream.on('error', this.reportWriteError);
      }
    }

    this.outputStream.write(`${this.layout.format(record)}\n`);
  }

  /**
   * Disposes `FileAppender`. Waits for the underlying file stream to be completely flushed and closed.
   */
  public async dispose() {
    await new Promise<void>((resolve) => {
      if (this.outputStream === undefined) {
        return resolve();
      }

      const outputStream = this.outputStream;
      this.outputStream = undefined;

      outputStream.end(() => {
        resolve();
      });
    });
  }

  private ensureDirectory(path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }
}
