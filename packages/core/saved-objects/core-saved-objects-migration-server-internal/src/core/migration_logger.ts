/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Logger, LogMeta } from '@kbn/logging';
import type { SavedObjectsMigrationLogger } from '@kbn/core-saved-objects-server';

/*
 * This file provides a helper class for ensuring that all logging
 * in the migration system is done in a fairly uniform way.
 */

export type LogFn = (path: string[], message: string) => void;

export class MigrationLogger implements SavedObjectsMigrationLogger {
  private logger: Logger;

  constructor(log: Logger) {
    this.logger = log;
  }

  public info = (msg: string) => this.logger.info(msg);
  public debug = (msg: string) => this.logger.debug(msg);
  public warn = (msg: string) => this.logger.warn(msg);
  public error = (msg: string, meta: LogMeta) => this.logger.error(msg, meta);
}
