/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LogMeta } from '@kbn/logging';
import type { SavedObjectsMigrationLogger } from '@kbn/core-saved-objects-server';
export type LogFn = (path: string[], message: string) => void;
export declare class MigrationLogger implements SavedObjectsMigrationLogger {
  private logger;
  constructor(log: Logger);
  info: (msg: string) => void;
  debug: (msg: string) => void;
  warn: (msg: string) => void;
  error: (msg: string, meta: LogMeta) => void;
}
