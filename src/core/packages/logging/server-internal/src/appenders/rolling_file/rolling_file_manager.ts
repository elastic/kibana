/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';
import type { WriteStream } from 'fs';
import { createWriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';
import { toLogFileWriteError } from '../write_error_handler';
import type { RollingFileContext } from './rolling_file_context';

/**
 * Delegate of the {@link RollingFileAppender} used to manage the log file access
 */
export class RollingFileManager {
  private readonly filePath;
  private outputStream?: WriteStream;
  private writeFailed = false;
  private readonly onWriteError?: LogFileWriteErrorHandler;

  constructor(
    private readonly context: RollingFileContext,
    onWriteError?: LogFileWriteErrorHandler
  ) {
    this.filePath = context.filePath;
    this.onWriteError = typeof onWriteError === 'function' ? onWriteError : undefined;
  }

  write(chunk: string) {
    if (this.writeFailed) {
      return;
    }

    try {
      const stream = this.ensureStreamOpen();
      this.context.currentFileSize += Buffer.byteLength(chunk, 'utf8');
      stream.write(chunk);
    } catch (error) {
      if (!this.onWriteError) {
        throw error;
      }
      this.handleWriteError(error);
    }
  }

  async closeStream() {
    return new Promise<void>((resolve) => {
      if (this.outputStream === undefined) {
        return resolve();
      }
      this.outputStream.end(() => {
        this.outputStream = undefined;
        resolve();
      });
    });
  }

  private handleWriteError(error: unknown) {
    if (this.writeFailed) {
      return;
    }
    this.writeFailed = true;
    const stream = this.outputStream;
    this.outputStream = undefined;
    stream?.destroy();
    this.onWriteError!(toLogFileWriteError(error, this.filePath));
  }

  private ensureStreamOpen() {
    if (this.outputStream === undefined) {
      this.ensureDirectory(this.filePath);
      this.outputStream = createWriteStream(this.filePath, {
        encoding: 'utf8',
        flags: 'a',
      });
      if (this.onWriteError) {
        this.outputStream.on('error', (error) => this.handleWriteError(error));
      }
      // refresh the file meta in case it was not initialized yet.
      this.context.refreshFileInfo();
    }
    return this.outputStream!;
  }

  private ensureDirectory(path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }
}
