/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { WORKFLOWS_STEP_EXECUTIONS_INDEX } from '../../../common';
import { WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS } from './index_mappings';
import { createIndexWithMappings } from '../../../common/create_index';

export interface WorkflowLogEvent {
  '@timestamp'?: string;
  message?: string;
  level?: 'trace' | 'debug' | 'info' | 'warn' | 'error';
  workflow?: {
    id?: string;
    name?: string;
    execution_id?: string;
    step_id?: string;
    step_execution_id?: string;
    step_name?: string;
    step_type?: string;
  };
  event?: {
    action?: string;
    category?: string[];
    type?: string[];
    provider?: string;
    outcome?: 'success' | 'failure' | 'unknown';
    duration?: number;
    start?: string;
    end?: string;
  };
  error?: {
    message?: string;
    type?: string;
    stack_trace?: string;
  };
  tags?: string[];
  [key: string]: any;
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

export class LogsRepository {
  private indexName = WORKFLOWS_STEP_EXECUTIONS_INDEX;
  constructor(private esClient: ElasticsearchClient, private logger: Logger) {}

  async createLogs(logEvents: WorkflowLogEvent[]): Promise<void> {
    await this.esClient?.bulk({
      refresh: 'wait_for',
      index: this.indexName,
      body: logEvents.flatMap((logEvent) => [{ create: {} }, { doc: logEvent }]),
    });
  }

  public async initialize(): Promise<void> {
    await createIndexWithMappings({
      esClient: this.esClient,
      indexName: this.indexName,
      mappings: WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS,
      logger: this.logger,
    });
  }

  public async getExecutionLogs(executionId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            term: {
              'workflow.execution_id': executionId,
            },
          },
        ],
      },
    };

    return this.searchLogs(query);
  }

  public async getLogsByLevel(level: string, executionId?: string): Promise<LogSearchResult> {
    const mustClauses: any[] = [
      {
        term: {
          level,
        },
      },
    ];

    if (executionId) {
      mustClauses.push({
        term: {
          'workflow.execution_id': executionId,
        },
      });
    }

    const query = {
      bool: {
        must: mustClauses,
      },
    };

    return this.searchLogs(query);
  }

  public async getRecentLogs(limit: number = 100): Promise<LogSearchResult> {
    const query = {
      match_all: {},
    };

    const response = await this.esClient.search({
      index: this.indexName,
      query,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: limit,
    });

    return {
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0,
      logs: response.hits.hits.map((hit: any) => hit._source),
    };
  }

  public async getStepLogs(executionId: string, stepId: string): Promise<LogSearchResult> {
    const query = {
      bool: {
        must: [
          {
            term: {
              'workflow.execution_id': executionId,
            },
          },
          {
            term: {
              'workflow.step_id': stepId,
            },
          },
        ],
      },
    };

    return this.searchLogs(query);
  }

  private async searchLogs(query: any): Promise<LogSearchResult> {
    const response = await this.esClient.search({
      index: this.indexName,
      query,
      sort: [{ '@timestamp': { order: 'desc' } }],
      size: 1000, // Default limit
    });

    return {
      total:
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0,
      logs: response.hits.hits.map((hit: any) => hit._source),
    };
  }
}
