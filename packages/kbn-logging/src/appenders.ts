/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { LogRecord } from './log_record';

/**
 * Entity that can append `LogRecord` instances to file, stdout, memory or whatever
 * is implemented internally. It's supposed to be used by `Logger`.
 * @internal
 */
export interface Appender {
  append(record: LogRecord): void;
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
