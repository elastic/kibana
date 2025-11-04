/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { GetExecutionLogsParams, GetStepLogsParams } from '../workflows_management_api';

// Simple interfaces for workflow logging
export interface IWorkflowEventLogger {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logInfo(message: string, meta?: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }>;
}

// Simple logger implementation with console support and log search capabilities
export class SimpleWorkflowLogger implements IWorkflowEventLogger {
  constructor(
    private logger: Logger,
    private esClient: ElasticsearchClient,
    private logsIndex: string,
    private enableConsoleLogging: boolean = false
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logInfo(message: string, meta?: any): void {
    if (this.enableConsoleLogging) {
      this.logger.info(`🔄 WORKFLOW: ${message}`, meta);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logError(message: string, error?: Error, meta?: any): void {
    if (this.enableConsoleLogging) {
      this.logger.error(`🔄 WORKFLOW: ${message}`, { error, ...meta });
    }
  }

  async searchLogs(
    params: GetExecutionLogsParams | GetStepLogsParams,
    spaceId?: string
  ): Promise<LogSearchResult> {
    try {
      const { limit = 100, offset = 0, sortField = '@timestamp', sortOrder = 'desc' } = params;

      // Map API field names to Elasticsearch field names
      const fieldMapping: Record<string, string> = {
        timestamp: '@timestamp',
        '@timestamp': '@timestamp',
      };
      const mappedSortField = fieldMapping[sortField] || sortField;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mustQueries: any[] = [];

      if ('executionId' in params) {
        mustQueries.push({
          term: { 'workflow.execution_id.keyword': params.executionId },
        });
      }

      if ('stepExecutionId' in params && params.stepExecutionId) {
        mustQueries.push({
          term: { 'workflow.step_execution_id.keyword': params.stepExecutionId },
        });
      }

      if ('stepId' in params && params.stepId) {
        mustQueries.push({
          term: { 'workflow.step_id.keyword': params.stepId },
        });
      }

      if (spaceId) {
        mustQueries.push({
          term: { 'spaceId.keyword': spaceId },
        });
      }

      const response = await this.esClient.search({
        index: this.logsIndex,
        size: limit,
        from: offset,
        query: {
          bool: {
            must: mustQueries,
          },
        },
        sort: [{ [mappedSortField]: { order: sortOrder } }],
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const logs = response.hits.hits.map((hit: any) => hit._source);
      const total =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      return { total, logs };
    } catch (error) {
      this.logger.error('Failed to search workflow logs', error);
      return { total: 0, logs: [] };
    }
  }
}
