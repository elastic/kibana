/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SortOrder } from '@elastic/elasticsearch/lib/api/types';
import type { IWorkflowEventLogger, WorkflowEventLoggerContext } from './workflow_event_logger';
import type { LogSearchResult } from '../repositories/logs_repository';

export interface BaseLogsParams {
  // spaces
  spaceId?: string;
  // pagination
  sortField?: string;
  sortOrder?: SortOrder;
  page?: number;
  size?: number;
}

export interface SearchLogsParams extends BaseLogsParams {
  executionId?: string;
  stepExecutionId?: string;
  stepId?: string;
}

export interface ExecutionLogsParams extends BaseLogsParams {
  executionId: string;
}

export interface StepLogsParams extends BaseLogsParams {
  stepExecutionId: string;
  executionId: string;
}

export interface LogsByLevelParams extends BaseLogsParams {
  executionId?: string;
  level: string;
}

export interface IWorkflowEventLoggerService {
  createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger;
  createWorkflowLogger(workflowId: string, workflowName?: string): IWorkflowEventLogger;
  createExecutionLogger(
    workflowId: string,
    executionId: string,
    workflowName?: string
  ): IWorkflowEventLogger;
  createStepLogger(
    workflowId: string,
    executionId: string,
    stepId: string,
    stepName?: string,
    stepType?: string,
    workflowName?: string
  ): IWorkflowEventLogger;

  getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult>;
  getStepLogs(params: StepLogsParams): Promise<LogSearchResult>;
  getLogsByLevel(params: LogsByLevelParams): Promise<LogSearchResult>;
  searchLogs(params: SearchLogsParams): Promise<LogSearchResult>;
  getRecentLogs(limit?: number): Promise<LogSearchResult>;
}
