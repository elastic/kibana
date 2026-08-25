/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import type { LogFileWriteError } from '@kbn/core-logging-server';

/**
 * Schema fragment for the `onWriteError` option of the file-backed appenders; only ever wired
 * into the {@link LoggingServiceSetup.configure} validation path, never into YAML config.
 */
export const onWriteErrorSchema = schema.maybe(
  schema.any({
    validate: (value) => {
      if (typeof value !== 'function') {
        return 'expected a write-error handler function (error: LogFileWriteError) => void';
      }
    },
  })
);

/** Maps a filesystem failure to the {@link LogFileWriteError} reported to the handler. */
export const toLogFileWriteError = (error: unknown, path: string): LogFileWriteError => {
  const { code, message } = (error ?? {}) as NodeJS.ErrnoException;

  return { path, code, reason: message ?? String(error) };
};
