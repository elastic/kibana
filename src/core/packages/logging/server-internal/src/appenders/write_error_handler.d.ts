/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogFileWriteError } from '@kbn/core-logging-server';
/**
 * Schema fragment for the `onWriteError` option of the file-backed appenders; only ever wired
 * into the {@link LoggingServiceSetup.configure} validation path, never into YAML config.
 */
export declare const onWriteErrorSchema: import('@kbn/config-schema').Type<any>;
/** Maps a filesystem failure to the {@link LogFileWriteError} reported to the handler. */
export declare const toLogFileWriteError: (error: unknown, path: string) => LogFileWriteError;
