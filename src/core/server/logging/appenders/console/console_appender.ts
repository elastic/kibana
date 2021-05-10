/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { schema } from '@kbn/config-schema';
import { Layout, LogRecord, DisposableAppender } from '@kbn/logging';
import { Layouts, LayoutConfigType } from '../../layouts/layouts';

const { literal, object } = schema;

export interface ConsoleAppenderConfig {
  type: 'console';
  layout: LayoutConfigType;
}

/**
 *
 * Appender that formats all the `LogRecord` instances it receives and logs them via built-in `console`.
 * @internal
 */
export class ConsoleAppender implements DisposableAppender {
  public static configSchema = object({
    type: literal('console'),
    layout: Layouts.configSchema,
  });

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
    // eslint-disable-next-line no-console
    console.log(this.layout.format(record));
  }

  /**
   * Disposes `ConsoleAppender`.
   */
  public dispose() {
    // noop
  }
}
