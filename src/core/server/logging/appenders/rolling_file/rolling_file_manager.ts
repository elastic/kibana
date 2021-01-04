/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createWriteStream, WriteStream } from 'fs';
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
      this.outputStream = createWriteStream(this.filePath, {
        encoding: 'utf8',
        flags: 'a',
      });
      // refresh the file meta in case it was not initialized yet.
      this.context.refreshFileInfo();
    }
    return this.outputStream!;
  }
}
