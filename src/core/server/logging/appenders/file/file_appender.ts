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

import { schema } from '@kbn/config-schema';
import { LogRecord, Layout, DisposableAppender } from '@kbn/logging';
import { createWriteStream, WriteStream } from 'fs';

import { Layouts, LayoutConfigType } from '../../layouts/layouts';

export interface FileAppenderConfig {
  kind: 'file';
  layout: LayoutConfigType;
  path: string;
}

/**
 * Appender that formats all the `LogRecord` instances it receives and writes them to the specified file.
 * @internal
 */
export class FileAppender implements DisposableAppender {
  public static configSchema = schema.object({
    kind: schema.literal('file'),
    layout: Layouts.configSchema,
    path: schema.string(),
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
    await new Promise((resolve) => {
      if (this.outputStream === undefined) {
        return resolve();
      }

      this.outputStream.end(() => {
        this.outputStream = undefined;
        resolve();
      });
    });
  }
}
