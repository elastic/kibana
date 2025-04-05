/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { Layout, LogRecord, DisposableAppender } from '@kbn/logging';
import { LayoutConfigType } from '@kbn/core-logging-server/src/layout';
import { MessagePort } from 'worker_threads';
import { Layouts } from '../../layouts/layouts';

const { literal, object } = schema;

/**
 *
 * Appender that formats all the `LogRecord` instances it receives and sends it to the main thread via the message channel`.
 * @internal
 */
export class MessageChannelAppender implements DisposableAppender {
  public static configSchema = object({
    type: literal('console'),
    layout: Layouts.configSchema,
  });

  private readonly layout: Layout;

  /**
   * Creates MessageChannelAppender instance.
   * @param layout Instance of `Layout` sub-class responsible for `LogRecord` formatting.
   */
  constructor(layoutConfig: LayoutConfigType, private readonly port: MessagePort) {
    this.layout = Layouts.create(layoutConfig);
  }

  /**
   * Formats specified `record` and sends it to the main thread via the message channel.
   * @param record `LogRecord` instance to be logged.
   */
  public append(record: LogRecord) {
    this.port.postMessage(this.layout.format(record));
  }

  /**
   * Disposes `MessageChannelAppender`.
   */
  public dispose() {
    // noop
  }
}
