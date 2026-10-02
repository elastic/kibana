/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A failure to write to a log file, reported to a {@link LogFileWriteErrorHandler}.
 *
 * @public
 */
export interface LogFileWriteError {
  /** The absolute path that could not be written. */
  path: string;
  /** The `NodeJS.ErrnoException` code, e.g. `ENOSPC`, `EDQUOT`, `EROFS`, `EACCES`. */
  code?: string;
  reason: string;
}

/**
 * Called when a file-backed appender cannot write, instead of letting the failure reach the
 * process as an `uncaughtException`.
 *
 * @public
 */
export type LogFileWriteErrorHandler = (error: LogFileWriteError) => void;
