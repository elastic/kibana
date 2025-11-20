/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { IWorkflowEventLogger, WorkflowEventLoggerContext } from './workflow_event_logger';
import { WorkflowEventLogger } from './workflow_event_logger';
import type { LogSearchResult, LogsRepository } from '../repositories/logs_repository';

export interface WorkflowEventLoggerServiceOptions {
  logsRepository: LogsRepository;
  logger: Logger;
  indexName: string;
  enableConsoleLogging?: boolean;
}

export class WorkflowEventLoggerService {
  private logsRepository: LogsRepository;
  private logger: Logger;
  private enableConsoleLogging: boolean;
  private initialized: boolean = false;

  constructor(options: WorkflowEventLoggerServiceOptions) {
    this.logsRepository = options.logsRepository;
    this.logger = options.logger;
    this.enableConsoleLogging = options.enableConsoleLogging || false;
  }

  public createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger {
    if (!this.initialized) {
      throw new Error('WorkflowEventLoggerService not initialized. Call initialize() first.');
    }
    return new WorkflowEventLogger(this.logsRepository, this.logger, context, {
      enableConsoleLogging: this.enableConsoleLogging,
    });
  }

  public createWorkflowLogger(workflowId: string, workflowName?: string): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
    });
  }

  public createExecutionLogger(
    workflowId: string,
    executionId: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
      executionId,
    });
  }

  public createStepLogger(
    workflowId: string,
    executionId: string,
    stepId: string,
    stepName?: string,
    stepType?: string,
    workflowName?: string
  ): IWorkflowEventLogger {
    return this.createLogger({
      workflowId,
      workflowName,
      executionId,
      stepId,
      stepName,
      stepType,
    });
  }

  public getExecutionLogs(executionId: string): Promise<LogSearchResult> {
    return this.logsRepository.getExecutionLogs(executionId);
  }

  public getStepLogs(executionId: string, stepId: string): Promise<LogSearchResult> {
    return this.logsRepository.getStepLogs(executionId, stepId);
  }

  public async getLogsByLevel(level: string, executionId?: string): Promise<LogSearchResult> {
    return this.logsRepository.getLogsByLevel(level, executionId);
  }

  public async getRecentLogs(limit: number = 100): Promise<LogSearchResult> {
    try {
      return await this.logsRepository.getRecentLogs(limit);
    } catch (error) {
      this.logger.error('Failed to get recent workflow logs', error);
      throw error;
    }
  }
}
