/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogFileWriteErrorHandler } from '@kbn/core-logging-server';
import type { RollingFileContext } from './rolling_file_context';
/**
 * Delegate of the {@link RollingFileAppender} used to manage the log file access
 */
export declare class RollingFileManager {
  private readonly context;
  private readonly filePath;
  private outputStream?;
  private readonly reportWriteError?;
  constructor(context: RollingFileContext, onWriteError?: LogFileWriteErrorHandler);
  write(chunk: string): void;
  closeStream(): Promise<void>;
  private ensureStreamOpen;
  private ensureDirectory;
}
