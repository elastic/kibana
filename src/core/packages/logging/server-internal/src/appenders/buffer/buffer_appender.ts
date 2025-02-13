/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogRecord, DisposableAppender } from '@kbn/logging';

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
