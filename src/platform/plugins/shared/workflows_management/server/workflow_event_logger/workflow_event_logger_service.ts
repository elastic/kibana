/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient, Logger } from '@kbn/core/server';
import { createIndexWithMappings } from '../workflows_management/lib/create_index';
import { WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS } from './index_mappings';
import {
  WorkflowEventLogger,
  IWorkflowEventLogger,
  WorkflowEventLoggerContext,
} from './workflow_event_logger';

export interface WorkflowEventLoggerServiceOptions {
  esClient: ElasticsearchClient;
  logger: Logger;
  indexName: string;
}

export class WorkflowEventLoggerService {
  private esClient: ElasticsearchClient;
  private logger: Logger;
  private indexName: string;
  private initialized: boolean = false;

  constructor(options: WorkflowEventLoggerServiceOptions) {
    this.esClient = options.esClient;
    this.logger = options.logger;
    this.indexName = options.indexName;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await createIndexWithMappings({
        esClient: this.esClient,
        indexName: this.indexName,
        mappings: WORKFLOW_EXECUTION_LOGS_INDEX_MAPPINGS,
        logger: this.logger,
      });

      this.initialized = true;
      this.logger.debug(`Workflow event logger service initialized with index: ${this.indexName}`);
    } catch (error) {
      this.logger.error(`Failed to initialize workflow event logger service: ${error.message}`);
      throw error;
    }
  }

  public createLogger(context: WorkflowEventLoggerContext): IWorkflowEventLogger {
    if (!this.initialized) {
      throw new Error('WorkflowEventLoggerService not initialized. Call initialize() first.');
    }

    return new WorkflowEventLogger(this.esClient, this.logger, this.indexName, context);
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

  public async searchLogs(query: {
    workflowId?: string;
    executionId?: string;
    stepId?: string;
    level?: string;
    startTime?: Date;
    endTime?: Date;
    size?: number;
    from?: number;
  }) {
    if (!this.initialized) {
      throw new Error('WorkflowEventLoggerService not initialized. Call initialize() first.');
    }

    const must: any[] = [];

    if (query.workflowId) {
      must.push({ term: { 'workflow.id': query.workflowId } });
    }

    if (query.executionId) {
      must.push({ term: { 'workflow.execution_id': query.executionId } });
    }

    if (query.stepId) {
      must.push({ term: { 'workflow.step_id': query.stepId } });
    }

    if (query.level) {
      must.push({ term: { level: query.level } });
    }

    if (query.startTime || query.endTime) {
      const range: any = {};
      if (query.startTime) {
        range.gte = query.startTime.toISOString();
      }
      if (query.endTime) {
        range.lte = query.endTime.toISOString();
      }
      must.push({ range: { '@timestamp': range } });
    }

    try {
      const response = await this.esClient.search({
        index: this.indexName,
        query: must.length > 0 ? { bool: { must } } : { match_all: {} },
        sort: [{ '@timestamp': 'desc' }],
        size: query.size || 1000,
        from: query.from || 0,
      });

      return {
        total: response.hits.total,
        logs: response.hits.hits.map((hit) => ({
          id: hit._id,
          source: hit._source,
        })),
      };
    } catch (error) {
      this.logger.error(`Failed to search workflow logs: ${error.message}`);
      throw error;
    }
  }

  public async getExecutionLogs(executionId: string) {
    return this.searchLogs({ executionId });
  }

  public async getStepLogs(executionId: string, stepId: string) {
    return this.searchLogs({ executionId, stepId });
  }

  public async shutdown(): Promise<void> {
    // Implementation for graceful shutdown
    this.logger.debug('Workflow event logger service shutting down');
  }
}
