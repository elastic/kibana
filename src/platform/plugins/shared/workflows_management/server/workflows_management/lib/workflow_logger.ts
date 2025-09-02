/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';

// Simple interfaces for workflow logging
export interface IWorkflowEventLogger {
  logInfo(message: string, meta?: any): void;
  logError(message: string, error?: Error, meta?: any): void;
}

export interface LogSearchResult {
  total: number;
  logs: Array<{
    '@timestamp': string;
    message: string;
    level: string;
    workflow?: {
      id?: string;
      name?: string;
      execution_id?: string;
      step_id?: string;
      step_name?: string;
    };
    [key: string]: any;
  }>;
}

// Simple logger implementation with console support
export class SimpleWorkflowLogger implements IWorkflowEventLogger {
  constructor(private logger: Logger, private enableConsoleLogging: boolean = false) {}

  logInfo(message: string, meta?: any): void {
    if (this.enableConsoleLogging) {
      this.logger.info(`🔄 WORKFLOW: ${message}`, meta);
    }
  }

  logError(message: string, error?: Error, meta?: any): void {
    if (this.enableConsoleLogging) {
      this.logger.error(`🔄 WORKFLOW: ${message}`, { error, ...meta });
    }
  }
}
