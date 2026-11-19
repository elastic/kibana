/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type {
  BaseLogsParams,
  ExecutionLogsParams,
  IWorkflowLogsQueryService,
  LogsByLevelParams,
  SearchLogsParams,
  StepLogsParams,
} from './types';
import type {
  LogSearchResult,
  LogsRepository,
  SearchLogsParams as RepositorySearchLogsParams,
} from '../repositories/logs_repository';

/** Reads workflow execution logs. */
export class WorkflowLogsQueryService implements IWorkflowLogsQueryService {
  constructor(private logsRepository: LogsRepository, private readonly logger: Logger) {}

  private transformPaginationParams(params: BaseLogsParams): Partial<RepositorySearchLogsParams> {
    const { size = 200, page = 1, ...rest } = params;
    return {
      ...rest,
      limit: size,
      offset: (page - 1) * size,
    };
  }

  public getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    if (!params.executionId) {
      this.logger.error('Execution logs: Execution ID is required');
      throw new Error('Execution logs: Execution ID is required');
    }

    return this.logsRepository.searchLogs(this.transformPaginationParams(params));
  }

  public getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    if (!params.executionId || !params.stepExecutionId) {
      this.logger.error('Step logs: Execution ID and step execution ID are required');
      throw new Error('Step logs: Execution ID and step execution ID are required');
    }

    return this.logsRepository.searchLogs(this.transformPaginationParams(params));
  }

  public async getLogsByLevel(params: LogsByLevelParams): Promise<LogSearchResult> {
    if (!params.level) {
      this.logger.error('Logs by level: Level is required');
      throw new Error('Logs by level: Level is required');
    }

    return this.logsRepository.searchLogs(this.transformPaginationParams(params));
  }

  public async searchLogs(params: SearchLogsParams): Promise<LogSearchResult> {
    return this.logsRepository.searchLogs(this.transformPaginationParams(params));
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
