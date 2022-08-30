/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createWriteStream, WriteStream, mkdirSync } from 'fs';
import { dirname } from 'path';
import { RollingFileContext } from './rolling_file_context';

/**
 * Delegate of the {@link RollingFileAppender} used to manage the log file access
 */
export class RollingFileManager {
  private readonly filePath;
  private outputStream?: WriteStream;

  constructor(private readonly context: RollingFileContext) {
    this.filePath = context.filePath;
  }

  write(chunk: string) {
    const stream = this.ensureStreamOpen();
    this.context.currentFileSize += Buffer.byteLength(chunk, 'utf8');
    stream.write(chunk);
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

  private ensureStreamOpen() {
    if (this.outputStream === undefined) {
      this.ensureDirectory(this.filePath);
      this.outputStream = createWriteStream(this.filePath, {
        encoding: 'utf8',
        flags: 'a',
      });
      // refresh the file meta in case it was not initialized yet.
      this.context.refreshFileInfo();
    }
    return this.outputStream!;
  }

  private ensureDirectory(path: string) {
    mkdirSync(dirname(path), { recursive: true });
  }
}
