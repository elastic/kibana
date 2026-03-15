/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments
/* eslint-disable @typescript-eslint/no-explicit-any,  */

import type { ElasticsearchClient } from '@kbn/core/server';
import { isMaximumResponseSizeExceededError } from '@kbn/es-errors';
import { buildElasticsearchRequest } from '@kbn/workflows';
import { formatBytes, ResponseSizeLimitError } from './errors';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Extend BaseStep for elasticsearch-specific properties
export interface ElasticsearchActionStep extends BaseStep {
  type: string; // e.g., 'elasticsearch.search.query'
  with?: Record<string, any>;
}

export class ElasticsearchActionStepImpl extends BaseAtomicNodeImplementation<ElasticsearchActionStep> {
  constructor(
    step: ElasticsearchActionStep,
    contextManager: StepExecutionRuntime,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowRuntime);
  }

  public getInput() {
    // Render inputs from 'with' - support both direct step.with and step.configuration.with
    const stepWith = this.step.with || (this.step as any).configuration?.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(stepWith);
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
      const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();

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

      // Map ES transport maxResponseSize exceeded to our ResponseSizeLimitError
      if (isMaximumResponseSizeExceededError(error)) {
        const sizeLimitError = new ResponseSizeLimitError(
          this.getMaxResponseBytes(),
          this.step.name
        );
        // Run a lightweight query to help the user estimate the needed limit
        try {
          const esClient = this.stepExecutionRuntime.contextManager.getEsClientAsUser();
          const index =
            stepWith?.index || stepWith?.request?.path?.replace(/^\//, '').split('/')[0];
          const query = stepWith?.query || stepWith?.body?.query || stepWith?.request?.body?.query;
          const requestedSize = Number(stepWith?.size ?? stepWith?.body?.size ?? 0);

          if (index) {
            // Fetch 1 doc + count to estimate full response size
            const sampleResult: any = await esClient.transport.request({
              method: 'POST',
              path: `/${index}/_search`,
              body: {
                size: 1,
                track_total_hits: true,
                ...(query ? { query } : {}),
              },
            });
            const totalHits = sampleResult?.hits?.total?.value ?? sampleResult?.hits?.total ?? 0;
            const sampleDoc = sampleResult?.hits?.hits?.[0];
            const sampleDocBytes = sampleDoc
              ? Buffer.byteLength(JSON.stringify(sampleDoc), 'utf8')
              : 0;
            const docsToFetch = requestedSize > 0 ? Math.min(totalHits, requestedSize) : totalHits;
            const estimatedFullResponseBytes =
              sampleDocBytes > 0
                ? sampleDocBytes * docsToFetch + 500 // 500 bytes for response envelope
                : undefined;

            if (sizeLimitError.details) {
              sizeLimitError.details._debug = {
                totalMatchingDocs: totalHits,
                requestedSize: requestedSize || '?',
                avgDocSize: sampleDocBytes,
                docsToFetch,
                estimatedFullResponseSize: estimatedFullResponseBytes
                  ? `~${formatBytes(estimatedFullResponseBytes)}`
                  : 'unknown',
                suggestedLimit: estimatedFullResponseBytes
                  ? `${formatBytes(Math.ceil(estimatedFullResponseBytes * 1.1))}` // 10% headroom
                  : undefined,
                suggestion:
                  `Query matches ${totalHits} docs (avg ~${formatBytes(sampleDocBytes)} each), ` +
                  `step requests ${requestedSize || 'all'}. ${
                    estimatedFullResponseBytes
                      ? `Estimated full response: ~${formatBytes(estimatedFullResponseBytes)}. `
                      : ''
                  }To fit within the limit, try: ` +
                  `(1) reduce 'size', ` +
                  `(2) use '_source' to return only needed fields, ` +
                  `(3) add filters to narrow results, or ${
                    estimatedFullResponseBytes
                      ? `(4) set max-step-size to at least ${formatBytes(
                          Math.ceil(estimatedFullResponseBytes * 1.1)
                        )}.`
                      : `(4) increase max-step-size.`
                  }`,
              };
            }
          }
        } catch {
          // Best-effort -- don't fail the error handling if the debug query fails
          if (sizeLimitError.details) {
            sizeLimitError.details._debug = {
              stepType,
              query: stepWith,
            };
          }
        }
        this.workflowLogger.logError(
          `Elasticsearch action response size exceeded: ${stepType}`,
          sizeLimitError,
          {
            event: { action: 'elasticsearch-action', outcome: 'failure' },
            tags: ['elasticsearch', 'internal-action', 'error', 'response-size-exceeded'],
            labels: { step_type: stepType, action_type: 'elasticsearch' },
          }
        );
        return { input: stepWith, output: undefined, error: sizeLimitError };
      }

      this.workflowLogger.logError(`Elasticsearch action failed: ${stepType}`, error, {
        event: { action: 'elasticsearch-action', outcome: 'failure' },
        tags: ['elasticsearch', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });
      return this.handleFailure(stepWith, error);
    }
  }

  private async executeElasticsearchRequest(
    esClient: ElasticsearchClient,
    stepType: string,
    params: any
  ): Promise<any> {
    const maxResponseBytes = this.getMaxResponseBytes();
    const transportOptions = maxResponseBytes > 0 ? { maxResponseSize: maxResponseBytes } : {};

    // Support both raw API format and connector-driven syntax
    if (params.request) {
      // Raw API format: { request: { method, path, body } } - like Dev Console
      const { method = 'GET', path, body } = params.request;
      return esClient.transport.request({ method, path, body }, transportOptions);
    } else if (stepType === 'elasticsearch.request') {
      // Special case: elasticsearch.request type uses raw API format at top level
      const { method = 'GET', path, body, headers } = params;
      return esClient.transport.request(
        { method, path, body },
        { ...transportOptions, ...(headers ? { headers } : {}) }
      );
    } else {
      // Use generated connector definitions to determine method and path (covers all 568+ ES APIs)
      const {
        method,
        path,
        body: requestBody,
        query: queryParams,
        bulkBody,
      } = buildElasticsearchRequest(stepType, params);

      // Build query string manually if needed
      let finalPath = path;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        finalPath = `${path}?${queryString}`;
      }

      const requestOptions = {
        method,
        path: finalPath,
        body: !bulkBody ? requestBody : undefined,
        bulkBody,
      };

      return esClient.transport.request(requestOptions, transportOptions);
    }
  }
}
