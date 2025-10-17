/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LogLevel } from '@kbn/tooling-log';
import { ToolingLog, LOG_LEVEL_FLAGS, DEFAULT_LOG_LEVEL } from '@kbn/tooling-log';

export class ScoutLogger extends ToolingLog {
  /**
   * Creates a ScoutLogger instance.
   *
   * Log level resolution priority:
   *   1. The logLevel argument (if provided)
   *   2. The SCOUT_LOG_LEVEL environment variable (if set)
   *   3. The LOG_LEVEL environment variable (if set)
   *   4. The default log level ('info')
   *
   * The log level string is normalized (case-insensitive), and 'quiet' is treated as 'error'.
   * Only valid log levels from LOG_LEVEL_FLAGS are accepted.
   *
   * @param workerContext - Unique context string for the logger
   * @param logLevel - Optional log level string (highest priority)
   */
  constructor(workerContext: string, logLevel?: LogLevel) {
    // Helper to normalize and resolve log level string
    const resolveLogLevelFromEnv = (value: string | undefined): LogLevel | undefined => {
      if (typeof value === 'string' && value) {
        let normalized = value.toLowerCase();
        if (normalized === 'quiet') {
          normalized = 'error';
        }
        const found = LOG_LEVEL_FLAGS.find(({ name }) => name === normalized);
        if (found) return found.name as LogLevel;
      }
      return undefined;
    };

    const level =
      logLevel ||
      resolveLogLevelFromEnv(process.env.SCOUT_LOG_LEVEL) ||
      resolveLogLevelFromEnv(process.env.LOG_LEVEL) ||
      DEFAULT_LOG_LEVEL;
    super({ level, writeTo: process.stdout }, { context: workerContext });
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
