/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogRecord } from './log_record';

/**
 * Entity that can append `LogRecord` instances to file, stdout, memory or whatever
 * is implemented internally. It's supposed to be used by `Logger`.
 * @internal
 */
export interface Appender {
  append(record: LogRecord): void;
  /**
   * Appenders can be "attached" to one another so that they are able to act
   * as a sort of middleware by calling `append` on a different appender.
   *
   * As appenders cannot be attached to each other until they are configured,
   * the `addAppender` method can be used to pass in a newly configured appender
   * to attach.
   */
  addAppender?(appenderRef: string, appender: Appender): void;
  /**
   * For appenders which implement `addAppender`, they should declare a list of
   * `appenderRefs`, which specify the names of the appenders that their configuration
   * depends on.
   *
   * Note that these are the appender key names that the user specifies in their
   * config, _not_ the names of the appender types themselves.
   */
  appenderRefs?: string[];
}

/**
 * This interface should be additionally implemented by the `Appender`'s if they are supposed
 * to be properly disposed. It's intentionally separated from `Appender` interface so that `Logger`
 * that interacts with `Appender` doesn't have control over appender lifetime.
 * @internal
 */
export interface DisposableAppender extends Appender {
  dispose: () => void | Promise<void>;
}
