/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { LogLevel, ToolingLog, LOG_LEVEL_FLAGS, DEFAULT_LOG_LEVEL } from '@kbn/tooling-log';

export class ScoutLogger extends ToolingLog {
  constructor(workerContext: string, level: LogLevel) {
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

/**
 * Returns the resolved log level for Scout, prioritizing SCOUT_PW_LOG_LEVEL over LOG_LEVEL,
 * and falling back to DEFAULT_LOG_LEVEL if neither is set or recognized.
 */
function resolveLogLevel(envValue: string | undefined): LogLevel | undefined {
  if (typeof envValue === 'string' && envValue) {
    let normalized = envValue.toLowerCase();
    // Normalize common aliases for log levels
    if (normalized === 'quiet') {
      normalized = 'error';
    }
    const found = LOG_LEVEL_FLAGS.find(({ name }) => name === normalized);
    if (found) return found.name as LogLevel;
  }
  return undefined;
}

export function getScoutLogLevel(): LogLevel {
  return (
    resolveLogLevel(process.env.SCOUT_PW_LOG_LEVEL) ||
    resolveLogLevel(process.env.LOG_LEVEL) ||
    DEFAULT_LOG_LEVEL
  );
}
