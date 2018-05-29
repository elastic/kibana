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

import { LogRecord } from '../../log_record';
import { DisposableAppender } from '../appenders';

/**
 * Simple appender that just buffers `LogRecord` instances it receives. It is a *reserved* appender
 * that can't be set via configuration file.
 * @internal
 */
export class BufferAppender implements DisposableAppender {
  /**
   * List of the buffered `LogRecord` instances.
   */
  private readonly buffer: LogRecord[] = [];

  /**
   * Appends new `LogRecord` to the buffer.
   * @param record `LogRecord` instance to add to the buffer.
   */
  public append(record: LogRecord) {
    this.buffer.push(record);
  }

  /**
   * Clears buffer and returns all records that it had.
   */
  public flush() {
    return this.buffer.splice(0, this.buffer.length);
  }

  /**
   * Disposes `BufferAppender` and clears internal `LogRecord` buffer.
   */
  public async dispose() {
    this.flush();
  }
}
