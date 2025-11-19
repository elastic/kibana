/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger, LogMeta } from '@kbn/core/server';
import type { LogSearchResult, LogsRepository } from '@kbn/workflows-execution-engine/server';
import type { GetExecutionLogsParams, GetStepLogsParams } from '../workflows_management_api';

// Simple interfaces for workflow logging
export interface IWorkflowEventLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logInfo(message: string, meta?: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logError(message: string, error?: Error, meta?: any): void;
}

// Simple logger implementation with console support and log search capabilities
export class SimpleWorkflowLogger implements IWorkflowEventLogger {
  constructor(
    private logger: Logger,
    private logsRepository: LogsRepository,
    private enableConsoleLogging: boolean = false
  ) {}

  logInfo(message: string, meta?: LogMeta): void {
    if (this.enableConsoleLogging) {
      this.logger.info(`🔄 WORKFLOW: ${message}`, meta);
    }
  }

  logError(message: string, error?: Error, meta?: LogMeta): void {
    if (this.enableConsoleLogging) {
      this.logger.error(`🔄 WORKFLOW: ${message}`, { error, ...meta });
    }
  }

  async searchLogs(
    params: GetExecutionLogsParams | GetStepLogsParams,
    spaceId?: string
  ): Promise<LogSearchResult> {
    try {
      return await this.logsRepository.searchLogs(params, spaceId);
    } catch (error) {
      this.logError('Failed to search workflow logs', error);
      return { total: 0, logs: [] };
    }
  }
}
