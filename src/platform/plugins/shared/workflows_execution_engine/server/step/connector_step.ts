/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorExecutor } from '../connector_executor';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from './step_base';
import { StepBase } from './step_base';

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, any>;
}

export class ConnectorStepImpl extends StepBase<ConnectorStep> {
  constructor(
    step: ConnectorStep,
    contextManager: WorkflowContextManager,
    connectorExecutor: ConnectorExecutor,
    workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, connectorExecutor, workflowState);
  }

  public async _run(): Promise<RunStepResult> {
    try {
      const step = this.step;

      // Evaluate optional 'if' condition
      const shouldRun = await this.evaluateCondition(step.if);
      if (!shouldRun) {
        return { output: undefined, error: undefined };
      }

      // Get current context for templating
      const context = this.contextManager.getContext();

      // Parse step type and determine if it's a sub-action
      const [stepType, subActionName] = step.type.includes('.')
        ? step.type.split('.', 2)
        : [step.type, null];
      const isSubAction = subActionName !== null;

      // Render inputs from 'with'
      const withInputs = Object.entries(step.with ?? {}).reduce(
        (acc: Record<string, any>, [key, value]) => {
          if (typeof value === 'string') {
            acc[key] = this.templatingEngine.render(value, context);
          } else {
            acc[key] = value;
          }
          return acc;
        },
        {}
      );

      // Handle internal connector types
      if (step.type === 'elasticsearch.request' || step.type === 'kibana.request') {
        return await this.executeInternalConnector(step, withInputs);
      }

      // TODO: remove this once we have a proper connector executor/step for console
      if (step.type === 'console.log' || step.type === 'console') {
        this.workflowLogger.logInfo(`Log from step ${step.name}: \n${withInputs.message}`, {
          event: { action: 'log', outcome: 'success' },
          tags: ['console', 'log'],
        });
        // eslint-disable-next-line no-console
        console.log(withInputs.message);
        return { output: withInputs.message, error: undefined };
      } else if (step.type === 'delay') {
        const delayTime = step.with?.delay ?? 1000;
        // this.contextManager.logDebug(`Delaying for ${delayTime}ms`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        return { output: `Delayed for ${delayTime}ms`, error: undefined };
      }

      // Build final rendered inputs
      const renderedInputs = isSubAction
        ? {
            subActionParams: withInputs,
            subAction: subActionName,
          }
        : withInputs;

      const output = await this.connectorExecutor.execute(
        stepType,
        step['connector-id']!,
        renderedInputs,
        step.spaceId
      );

      const { data, status, message } = output;

      if (status === 'ok') {
        return { output: data, error: undefined };
      } else {
        return await this.handleFailure(message);
      }
    } catch (error) {
      return await this.handleFailure(error);
    }
  }

  private async executeInternalConnector(
    step: ConnectorStep,
    withInputs: Record<string, any>
  ): Promise<RunStepResult> {
    try {
      const request = withInputs.request;
      if (!request) {
        throw new Error('Request configuration is required for internal connector steps');
      }

      let response: any;
      let executionTime: number;

      if (step.type === 'elasticsearch.request') {
        response = await this.executeElasticsearchRequest(request);
      } else if (step.type === 'kibana.request') {
        response = await this.executeKibanaRequest(request);
      } else {
        throw new Error(`Unsupported internal connector type: ${step.type}`);
      }

      // Log the execution
      this.workflowLogger.logInfo(`Internal connector step ${step.name} executed successfully`, {
        event: { action: step.type, outcome: 'success' },
        tags: ['internal-connector', step.type],
        kibana: {
          step: {
            name: step.name,
            type: step.type,
            method: request.method,
            path: request.path,
          },
        },
      });

      return {
        output: {
          response: response.body,
          status: response.status,
          headers: response.headers,
          executionTime: response.executionTime,
        },
        error: undefined,
      };
    } catch (error) {
      // Enhanced error handling for internal connector steps
      let errorMessage: string;

      if (error && typeof error === 'object' && 'meta' in error) {
        // This is an ES ResponseError - extract meaningful information
        const esError = error as any;
        const errorDetails = this.extractElasticsearchErrorDetails(esError);
        errorMessage = errorDetails.summary;
      } else {
        // Generic error handling
        errorMessage = error instanceof Error ? error.message : String(error);
      }

      // Log the error
      this.workflowLogger.logError(`Internal connector step ${step.name} failed: ${errorMessage}`);

      return {
        output: undefined,
        error: errorMessage,
      };
    }
  }

  private async executeElasticsearchRequest(request: any): Promise<any> {
    const startTime = Date.now();

    try {
      const { method, path, headers, body, query } = request;

      // Get ES client from context manager
      const esClient = this.contextManager.getEsClient();
      if (!esClient) {
        throw new Error('Elasticsearch client not available');
      }

      // Build the request options following Kibana's established patterns
      const requestOptions: any = {
        method, // Keep original case - ES expects GET, POST, etc.
        path,
        headers: headers || {},
      };

      if (body) {
        requestOptions.body = body;
      }

      if (query) {
        // Handle query parameters properly for ES like Kibana does
        if (typeof query === 'string') {
          requestOptions.querystring = query;
        } else if (typeof query === 'object') {
          // Convert object to proper ES query string format
          const queryParams = new URLSearchParams();
          Object.entries(query).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              queryParams.append(key, String(value));
            }
          });
          requestOptions.querystring = queryParams.toString();
        }
      }

      // Execute with proper transport options like Kibana does
      const response = await esClient.transport.request(requestOptions, {
        meta: true,
        maxRetries: 0,
      });

      const executionTime = Date.now() - startTime;

      return {
        body: response.body,
        status: response.statusCode,
        headers: response.headers,
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;

      // Enhanced error handling for ES errors
      if (error && typeof error === 'object' && 'meta' in error) {
        // This is an ES ResponseError - extract meaningful information
        const esError = error as any;
        const errorDetails = this.extractElasticsearchErrorDetails(esError);

        // Log the detailed error for debugging
        this.workflowLogger.logError(`Elasticsearch request failed: ${errorDetails.summary}`);

        throw new Error(errorDetails.summary);
      } else {
        // Generic error handling
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Elasticsearch request failed: ${errorMessage}`);
      }
    }
  }

  private extractElasticsearchErrorDetails(esError: any): {
    summary: string;
    details: string;
    statusCode: number;
    rootCause: string;
  } {
    try {
      const meta = esError.meta;
      const body = meta?.body;
      const statusCode = meta?.statusCode || 500;

      let summary = 'Elasticsearch request failed';
      let details = 'Unknown error';
      let rootCause = 'Unknown';

      if (body) {
        if (body.error) {
          // Extract the main error type
          summary = body.error.type || body.error.reason || summary;

          // Extract root cause if available
          if (
            body.error.root_cause &&
            Array.isArray(body.error.root_cause) &&
            body.error.root_cause.length > 0
          ) {
            const firstRootCause = body.error.root_cause[0];
            rootCause = firstRootCause.reason || firstRootCause.type || 'Unknown';
          }

          // Build detailed error message
          details = body.error.reason || body.error.type || 'No additional details available';
        }
      }

      // Create a user-friendly summary
      const userFriendlySummary = `${summary}${rootCause !== 'Unknown' ? `: ${rootCause}` : ''}`;

      return {
        summary: userFriendlySummary,
        details,
        statusCode,
        rootCause,
      };
    } catch (parseError) {
      // Fallback if error parsing fails
      return {
        summary: 'Elasticsearch request failed',
        details: 'Error parsing failed',
        statusCode: 500,
        rootCause: 'Unknown',
      };
    }
  }

  private async executeKibanaRequest(request: any): Promise<any> {
    const startTime = Date.now();

    // For now, we'll use a simplified approach since Kibana's internal HTTP
    // routing is complex and requires proper router setup
    // TODO: Implement proper Kibana internal request handling

    // Build the request URL
    let url = request.path;
    if (request.query) {
      // Handle query parameters properly
      if (typeof request.query === 'string') {
        url += `?${request.query}`;
      } else if (typeof request.query === 'object') {
        const queryParams = new URLSearchParams();
        Object.entries(request.query).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            queryParams.append(key, String(value));
          }
        });
        const queryString = queryParams.toString();
        if (queryString) {
          url += `?${queryString}`;
        }
      }
    }

    // For now, return a mock response since proper Kibana internal routing
    // requires router setup and context that we don't have here
    const executionTime = Date.now() - startTime;

    return {
      body: { message: 'Kibana internal requests not yet implemented' },
      status: 501, // Not Implemented
      headers: {},
      executionTime,
    };
  }
}
