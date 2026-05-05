/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import { ExecutionType } from '@kbn/workflows';
import type {
  EsWorkflowStepExecution,
  WorkflowExecutionDto,
  WorkflowExecutionHistoryModel,
  WorkflowExecutionListDto,
} from '@kbn/workflows';
import type { ChildWorkflowExecutionItem } from '@kbn/workflows/types/v1';
import type { LogSearchResult } from '@kbn/workflows-execution-engine/server';
import type {
  ExecutionLogsParams,
  StepLogsParams,
} from '@kbn/workflows-execution-engine/server/workflow_event_logger/types';

import type { WorkflowExecutionQueryDeps } from './types';
import { WORKFLOWS_EXECUTIONS_INDEX, WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../common';
import { getChildWorkflowExecutions } from '../api/lib/get_child_workflow_executions';
import { getWorkflowExecution } from '../api/lib/get_workflow_execution';
import {
  searchStepExecutions,
  type StepExecutionListResult,
} from '../api/lib/search_step_executions';
import { searchWorkflowExecutions } from '../api/lib/search_workflow_executions';
import type {
  GetStepExecutionParams,
  SearchStepExecutionsParams,
} from '../api/workflows_management_api';
import type { SearchWorkflowExecutionsParams } from '../api/workflows_management_service';

const DEFAULT_PAGE_SIZE = 100;

/**
 * Extends EsWorkflowStepExecution with the legacy `endedAt` field
 * that may exist on older documents written before the rename to `finishedAt`.
 */
interface StepExecutionWithLegacyFields extends EsWorkflowStepExecution {
  endedAt?: string;
}

export class WorkflowExecutionQueryService {
  constructor(private readonly deps: WorkflowExecutionQueryDeps) {}

  async getWorkflowExecution(
    executionId: string,
    spaceId: string,
    options?: { includeInput?: boolean; includeOutput?: boolean }
  ): Promise<WorkflowExecutionDto | null> {
    return getWorkflowExecution({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: executionId,
      spaceId,
      includeInput: options?.includeInput,
      includeOutput: options?.includeOutput,
    });
  }

  async getChildWorkflowExecutions(
    parentExecutionId: string,
    spaceId: string
  ): Promise<ChildWorkflowExecutionItem[]> {
    return getChildWorkflowExecutions({
      esClient: this.deps.esClient,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      parentExecutionId,
      spaceId,
    });
  }

  async getWorkflowExecutions(
    params: SearchWorkflowExecutionsParams,
    spaceId: string
  ): Promise<WorkflowExecutionListDto> {
    const must: estypes.QueryDslQueryContainer[] = [
      { term: { workflowId: params.workflowId } },
      {
        bool: {
          should: [{ term: { spaceId } }, { bool: { must_not: { exists: { field: 'spaceId' } } } }],
          minimum_should_match: 1,
        },
      },
    ];

    if (params.statuses) {
      must.push({ terms: { status: params.statuses } });
    }
    if (params.executionTypes && params.executionTypes?.length === 1) {
      const isTestRun = params.executionTypes[0] === ExecutionType.TEST;

      if (isTestRun) {
        must.push({ term: { isTestRun } });
      } else {
        must.push({
          bool: {
            should: [
              { term: { isTestRun: false } },
              { bool: { must_not: { exists: { field: 'isTestRun' } } } },
            ],
            minimum_should_match: 1,
          },
        });
      }
    }
    if (params.executedBy && params.executedBy.length > 0) {
      must.push({ terms: { executedBy: params.executedBy } });
    }

    if (params.omitStepRuns) {
      must.push({ bool: { must_not: { exists: { field: 'stepId' } } } });
    }

    const page = params.page ?? 1;
    const size = params.size ?? DEFAULT_PAGE_SIZE;
    const from = (page - 1) * size;

    return searchWorkflowExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      workflowExecutionIndex: WORKFLOWS_EXECUTIONS_INDEX,
      query: { bool: { must } },
      size,
      from,
      page,
    });
  }

  async getWorkflowExecutionHistory(
    executionId: string,
    spaceId: string
  ): Promise<WorkflowExecutionHistoryModel[]> {
    const response = await this.deps.esClient.search<StepExecutionWithLegacyFields>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: {
        bool: {
          must: [{ term: { executionId } }, { term: { spaceId } }],
        },
      },
      sort: [{ timestamp: { order: 'asc' } }],
    });

    return response.hits.hits.map((hit) => {
      if (!hit._source) {
        throw new Error('Missing _source in search result');
      }
      const source = hit._source;
      const startedAt = source.startedAt;
      const finishedAt = source.endedAt || source.finishedAt;

      let duration = 0;
      if (startedAt && finishedAt) {
        duration = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
      }

      return {
        ...source,
        finishedAt: finishedAt || '',
        duration,
      };
    });
  }

  async getStepExecutions(params: GetStepExecutionParams, spaceId: string) {
    const searchResult = await searchStepExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowExecutionId: params.executionId,
      additionalQuery: { term: { id: params.id } },
      spaceId,
    });
    return searchResult.results;
  }

  async searchStepExecutions(
    params: SearchStepExecutionsParams,
    spaceId: string
  ): Promise<StepExecutionListResult> {
    const sourceExcludes: string[] = [];
    if (!params.includeInput) sourceExcludes.push('input');
    if (!params.includeOutput) sourceExcludes.push('output');

    return searchStepExecutions({
      esClient: this.deps.esClient,
      logger: this.deps.logger,
      stepsExecutionIndex: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      workflowId: params.workflowId,
      stepId: params.stepId,
      spaceId,
      sourceExcludes: sourceExcludes.length > 0 ? sourceExcludes : undefined,
      page: params.page,
      size: params.size,
    });
  }

  async getExecutionLogs(params: ExecutionLogsParams): Promise<LogSearchResult> {
    if (!this.deps.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }
    return this.deps.workflowEventLoggerService.getExecutionLogs(params);
  }

  async getStepLogs(params: StepLogsParams): Promise<LogSearchResult> {
    if (!this.deps.workflowEventLoggerService) {
      throw new Error('WorkflowEventLoggerService not initialized');
    }
    return this.deps.workflowEventLoggerService.getStepLogs(params);
  }

  async getStepExecution(
    params: GetStepExecutionParams,
    spaceId: string
  ): Promise<EsWorkflowStepExecution | null> {
    const { executionId, id } = params;
    const response = await this.deps.esClient.search<EsWorkflowStepExecution>({
      index: WORKFLOWS_STEP_EXECUTIONS_INDEX,
      query: {
        bool: {
          must: [{ term: { workflowRunId: executionId } }, { term: { id } }, { term: { spaceId } }],
        },
      },
      size: 1,
      track_total_hits: false,
    });

    if (response.hits.hits.length === 0) {
      return null;
    }

    return response.hits.hits[0]._source ?? null;
  }
}
