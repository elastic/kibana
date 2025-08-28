/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from './step_base';
import { StepBase } from './step_base';

// Extend BaseStep for elasticsearch-specific properties
export interface ElasticsearchActionStep extends BaseStep {
  type: string; // e.g., 'elasticsearch.search.query'
  with?: Record<string, any>;
}

export class ElasticsearchActionStepImpl extends StepBase<ElasticsearchActionStep> {
  constructor(
    step: ElasticsearchActionStep,
    contextManager: WorkflowContextManager,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowRuntime);
  }

  public async _run(): Promise<RunStepResult> {
    try {
      // Support both direct step types (elasticsearch.search.query) and atomic+configuration pattern
      const stepType = this.step.type || (this.step as any).configuration?.type;
      const stepWith = this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logInfo(`Executing Elasticsearch action: ${stepType}`, {
        event: { action: 'elasticsearch-action', outcome: 'unknown' },
        tags: ['elasticsearch', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });

      // Get ES client (user-scoped if available, fallback otherwise)
      const esClient = this.contextManager.getEsClientAsUser();

      // Generic approach like Dev Console - just forward the request to ES
      const result = await this.executeElasticsearchRequest(esClient, stepType, stepWith);

      this.workflowLogger.logInfo(`Elasticsearch action completed: ${stepType}`, {
        event: { action: 'elasticsearch-action', outcome: 'success' },
        tags: ['elasticsearch', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });

      return { output: result, error: undefined };
    } catch (error) {
      const stepType = (this.step as any).configuration?.type || this.step.type;

      this.workflowLogger.logError(`Elasticsearch action failed: ${stepType}`, error as Error, {
        event: { action: 'elasticsearch-action', outcome: 'failure' },
        tags: ['elasticsearch', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });
      return await this.handleFailure(error);
    }
  }

  private async executeElasticsearchRequest(
    esClient: any,
    stepType: string,
    params: any
  ): Promise<any> {
    // Support both raw API format and sugar syntax
    if (params.request) {
      // Raw API format: { request: { method, path, body } } - like Dev Console
      const { method = 'GET', path, body } = params.request;
      return await esClient.transport.request({
        method,
        path,
        body,
      });
    } else {
      // Sugar syntax: convert to raw API call based on step type
      const { method, path, body } = this.convertSugarSyntaxToApi(stepType, params);
      return await esClient.transport.request({
        method,
        path,
        body,
      });
    }
  }

  private convertSugarSyntaxToApi(
    stepType: string,
    params: any
  ): { method: string; path: string; body?: any } {
    // Convert sugar syntax to raw API calls - same approach as Dev Console

    if (stepType.startsWith('elasticsearch.search')) {
      // For search: { index: "logs", query: {...}, size: 5 } -> GET /logs/_search { query: {...}, size: 5 }
      const index = params.index || '_all';
      const body: any = {};

      if (params.query) body.query = params.query;
      if (params.size !== undefined) body.size = params.size;
      if (params.sort) body.sort = params.sort;
      if (params.from !== undefined) body.from = params.from;
      if (params._source !== undefined) body._source = params._source;
      if (params.aggs) body.aggs = params.aggs;
      if (params.aggregations) body.aggregations = params.aggregations;

      return {
        method: 'GET',
        path: `/${index}/_search`,
        body: Object.keys(body).length > 0 ? body : undefined,
      };
    }

    if (stepType.startsWith('elasticsearch.index')) {
      // For index: { index: "logs", id?: "1", body: {...} } -> POST /logs/_doc/1 {...}
      const index = params.index;
      if (!index) throw new Error('index parameter is required');

      const path = params.id ? `/${index}/_doc/${params.id}` : `/${index}/_doc`;
      return {
        method: params.id ? 'PUT' : 'POST',
        path,
        body: params.body,
      };
    }

    if (stepType.startsWith('elasticsearch.delete')) {
      const index = params.index;
      if (!index) throw new Error('index parameter is required');

      if (params.id) {
        // Delete by ID: { index: "logs", id: "1" } -> DELETE /logs/_doc/1
        return {
          method: 'DELETE',
          path: `/${index}/_doc/${params.id}`,
        };
      } else if (params.query) {
        // Delete by query: { index: "logs", query: {...} } -> POST /logs/_delete_by_query { query: {...} }
        return {
          method: 'POST',
          path: `/${index}/_delete_by_query`,
          body: { query: params.query },
        };
      } else {
        throw new Error('Either id or query parameter is required for delete operations');
      }
    }

    // For other operations, try to infer from step type
    // e.g., 'elasticsearch.indices.create' -> PUT /{index} with body
    if (stepType.includes('.indices.create')) {
      const index = params.index;
      if (!index) throw new Error('index parameter is required for indices.create');
      return {
        method: 'PUT',
        path: `/${index}`,
        body: params.body || params,
      };
    }

    // Fallback: require raw API format for unsupported sugar syntax
    throw new Error(
      `Sugar syntax not supported for ${stepType}. Use raw API format with 'request' parameter: { request: { method: 'GET', path: '/my-index/_search', body: {...} } }`
    );
  }
}
