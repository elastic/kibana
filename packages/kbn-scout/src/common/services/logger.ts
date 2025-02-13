/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ToolingLog } from '@kbn/tooling-log';

export class ScoutLogger extends ToolingLog {
  constructor() {
    super({ level: 'verbose', writeTo: process.stdout }, { context: 'scout' });
    this.serviceLoaded('logger');
  }

  /**
   * Used to log when a service/fixture is loaded
   * @param name unique name of the service
   */
  public serviceLoaded(name: string) {
    this.debug(`[service] ${name}`);
  }
}

let loggerInstance: ScoutLogger | null = null;

/**
 * Singleton logger instance to share across the Scout components
 * @returns {ScoutLogger}
 */
export function getLogger(): ScoutLogger {
  if (!loggerInstance) {
    loggerInstance = new ScoutLogger();
  }

  return loggerInstance;
}
