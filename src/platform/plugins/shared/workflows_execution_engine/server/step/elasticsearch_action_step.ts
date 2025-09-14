/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildRequestFromConnector } from '@kbn/workflows';
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

  public getInput() {
    // Get current context for templating
    const context = this.contextManager.getContext();
    // Render inputs from 'with' - support both direct step.with and step.configuration.with
    const stepWith = this.step.with || (this.step as any).configuration?.with || {};
    return Object.entries(stepWith).reduce((acc: Record<string, any>, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = this.templatingEngine.render(value, context);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  public async _run(withInputs?: any): Promise<RunStepResult> {
    try {
      // Support both direct step types (elasticsearch.search.query) and atomic+configuration pattern
      const stepType = this.step.type || (this.step as any).configuration?.type;
      // Use rendered inputs if provided, otherwise fall back to raw step.with or configuration.with
      const stepWith = withInputs || this.step.with || (this.step as any).configuration?.with;

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

      return { input: stepWith, output: result, error: undefined };
    } catch (error) {
      const stepType = (this.step as any).configuration?.type || this.step.type;
      const stepWith = withInputs || this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logError(`Elasticsearch action failed: ${stepType}`, error as Error, {
        event: { action: 'elasticsearch-action', outcome: 'failure' },
        tags: ['elasticsearch', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });
      return await this.handleFailure(stepWith, error);
    }
  }

  private async executeElasticsearchRequest(
    esClient: any,
    stepType: string,
    params: any
  ): Promise<any> {
    // Support both raw API format and connector-driven syntax
    if (params.request) {
      // Raw API format: { request: { method, path, body } } - like Dev Console
      const { method = 'GET', path, body } = params.request;
      return await esClient.transport.request({
        method,
        path,
        body,
      });
    } else {
      // Use generated connector definitions to determine method and path (covers all 568+ ES APIs)
      const {
        method,
        path,
        body: requestBody,
        params: queryParams,
      } = buildRequestFromConnector(stepType, params);

      // Build query string manually if needed
      let finalPath = path;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        finalPath = `${path}?${queryString}`;
      }

      const requestOptions = {
        method,
        path: finalPath,
        body: requestBody,
      };

      // console.log('DEBUG - Sending to ES client:', JSON.stringify(requestOptions, null, 2));
      if (requestOptions.path.endsWith('/_bulk')) {
        // console.log('DEBUG - Bulk request detected:', JSON.stringify(requestOptions.body, null, 2));
        // Further processing for bulk requests can be added here
        // SG: ugly hack cuz _bulk is special
        const docs = requestOptions.body.operations; // your 3 doc objects
        // If the index is in the path `/tin-workflows/_bulk`, pass it explicitly:
        const pathIndex = requestOptions.path.split('/')[1]; // "tin-workflows"

        // Optional: forward query flags like refresh if you have them
        const refresh = queryParams?.refresh ?? false;

        // Turn each doc into an action+doc pair
        const bulkBody = docs.flatMap((doc: any, i: number) => {
          // If you have ids, use: { index: { _id: doc._id } }
          return [{ index: {} }, doc];
        });

        const resp = await esClient.bulk({
          index: pathIndex, // default index for all actions
          refresh, // true | false | 'wait_for'
          body: bulkBody, // [ {index:{}}, doc, {index:{}}, doc, ... ]
        });

        // Helpful: surface per-item errors if any
        if (resp.errors) {
          const itemsWithErrors = resp.items
            .map((it: any, idx: number) => ({
              idx,
              action: Object.keys(it)[0],
              result: it[Object.keys(it)[0]],
            }))
            .filter((x: any) => x.result.error);
          // console.error('Bulk had item errors:', itemsWithErrors);
        }
        return resp;
      }
      return await esClient.transport.request(requestOptions);
    }
  }
}
