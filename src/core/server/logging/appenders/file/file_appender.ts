/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import { createWriteStream, WriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';

import { Layouts, LayoutConfigType } from '../../layouts/layouts';

export interface FileAppenderConfig {
  type: 'file';
  layout: LayoutConfigType;
  fileName: string;
}

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
   * Writable file stream to write formatted `LogRecord` to.
   */
  private outputStream?: WriteStream;

  /**
   * Creates FileAppender instance with specified layout and file path.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   * @param path Path to the file where log records should be stored.
   */
  constructor(private readonly layout: Layout, private readonly path: string) {}

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
