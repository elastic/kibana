/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Layout, type LogRecord, type DisposableAppender, LogLevel } from '@kbn/logging';
import { unsafeConsole } from '@kbn/security-hardening';

/**
 *
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 * @internal
 */
export class ConsoleAppender implements DisposableAppender {
  /**
   * Creates ConsoleAppender instance.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   */
  constructor(private readonly layout: Layout) {}

  /**
   * Formats specified `record` and logs it via built-in `console`.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    const message = this.layout.format(record);
    switch (record.level) {
      case LogLevel.Error:
      case LogLevel.Fatal:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.error(message);
        break;
      case LogLevel.Warn:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.warn(message);
        break;
      case LogLevel.Trace:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.trace(message);
        break;
      case LogLevel.Info:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.info(message);
        break;
      case LogLevel.Debug:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.debug(message);
        break;
      default:
        // eslint-disable-next-line @kbn/eslint/no_unsafe_console
        unsafeConsole.log(message);
    }
  }

  /**
   * Disposes `ConsoleAppender`.
   */
  public dispose() {
    // noop
  }
}
