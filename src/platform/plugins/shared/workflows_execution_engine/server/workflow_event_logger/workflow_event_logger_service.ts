/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import type { IWorkflowEventLogger, WorkflowEventLoggerContext } from './workflow_event_logger';
import { WorkflowEventLogger } from './workflow_event_logger';
import { createIndexWithMappings } from './create_index';
import { WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS } from './index_mappings';

export interface WorkflowEventLoggerServiceOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
  enableConsoleLogging?: boolean;
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

export class WorkflowEventLoggerService {
  private esClient: ElasticsearchClient;
  private logger: Logger;
  private indexName: string;
  private enableConsoleLogging: boolean;
  private initialized: boolean = false;

  constructor(options: WorkflowEventLoggerServiceOptions) {
    this.esClient = options.esClient;
    this.logger = options.logger;
    this.indexName = options.indexName;
    this.enableConsoleLogging = options.enableConsoleLogging || false;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create the logs index with proper mappings
      await createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.indexName,
        mappings: WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS,
        logger: this.logger,
      });

      this.initialized = true;
      this.logger.debug(`WorkflowEventLoggerService initialized with index: ${this.indexName}`);
    } catch (error) {
      this.logger.error('Failed to initialize WorkflowEventLoggerService', error);
      throw error;
    }
  }

  public createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger {
    if (!this.initialized) {
      throw new Error('WorkflowEventLoggerService not initialized. Call initialize() first.');
    }
    return new WorkflowEventLogger(this.esClient, this.logger, this.indexName, context, {
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

  public async searchLogs(query: any): Promise<LogSearchResult> {
    if (!this.initialized) {
      throw new Error('WorkflowEventLoggerService not initialized. Call initialize() first.');
    }

    try {
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
    } catch (error) {
      this.logger.error('Failed to search workflow logs', error);
      throw error;
    }
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

    try {
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
    } catch (error) {
      this.logger.error('Failed to get recent workflow logs', error);
      throw error;
    }
  }
}
