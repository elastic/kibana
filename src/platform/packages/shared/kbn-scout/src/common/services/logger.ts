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
  constructor(workerContext: string) {
    super({ level: 'verbose', writeTo: process.stdout }, { context: workerContext });
    this.serviceLoaded('logger');
  }

  /**
   * Used to log when a service/fixture is loaded
   * @param name unique name of the service
   */
  public serviceLoaded(name: string) {
    this.debug(`[${name}] loaded`);
  }

  /**
   * Used to log a message for a service/fixture
   */
  public serviceMessage(name: string, message: string) {
    this.debug(`[${name}] ${message}`);
  }
}

const loggerInstances = new Map<string, ScoutLogger>();

/**
 * Singleton logger instance for specific worker to share across the Scout components
 * @param workerContext logger context, e.g. `scout-worker-1`; default is `scout`
 * @returns {ScoutLogger} logger instance
 */
export function getLogger(workerContext: string = 'scout'): ScoutLogger {
  if (!loggerInstances.has(workerContext)) {
    loggerInstances.set(workerContext, new ScoutLogger(workerContext));
  }

  return loggerInstances.get(workerContext)!;
}
