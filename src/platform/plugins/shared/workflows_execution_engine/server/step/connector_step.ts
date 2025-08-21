/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart } from '@kbn/core/server';
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

  private async executeInternalConnector(step: ConnectorStep, withInputs: Record<string, any>): Promise<RunStepResult> {
    if (!this.core) {
      throw new Error('Core services not available for internal connector execution');
    }

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
      this.workflowLogger.logInfo(
        `Internal connector step ${step.name} executed successfully`,
        {
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
        }
      );

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
      return await this.handleFailure(error);
    }
  }

  private async executeElasticsearchRequest(request: any): Promise<any> {
    const esClient = this.contextManager.getEsClient();
    if (!esClient) {
      throw new Error('Elasticsearch client not available');
    }

    const startTime = Date.now();
    
    try {
      // Get the user context from the full context if available
      const fullContext = this.contextManager.getFullContext();
      const userContext = fullContext?.userContext;

      // Use scoped client if we have user context, otherwise use internal user
      let client = esClient.asInternalUser;
      
      if (userContext) {
        // Create a mock request with user information that can be used with asScoped
        const mockRequest = this.createMockRequestWithUser(userContext);
        client = esClient.asScoped(mockRequest).asCurrentUser;
      }

      const response = await client.transport.request({
        method: request.method,
        path: request.path,
        body: request.body,
        querystring: request.query,
      }) as any;
      const executionTime = Date.now() - startTime;

      return {
        body: response.body,
        status: response.statusCode,
        headers: response.headers,
        executionTime,
      };
    } catch (error: any) {
      // Re-throw the error as is
      throw error;
    }
  }

  private createMockRequestWithUser(userContext: any): any {
    // Create a mock request object that includes the user information
    // This mimics the structure expected by asScoped
    return {
      auth: {
        isAuthenticated: true,
        credentials: {
          username: userContext.username,
          profile_uid: userContext.profile_uid,
        },
        scope: userContext.roles || [],
      },
      headers: {
        'kbn-xsrf': 'true',
      },
    };
  }

  private async executeKibanaRequest(request: any): Promise<any> {
    if (!this.core) {
      throw new Error('Core services not available');
    }

    const startTime = Date.now();
    
    // For now, we'll use a simple approach and make the request directly
    // TODO: Implement proper internal API call mechanism
    try {
      // Create a simple HTTP request to the internal API
      const response = await this.core.http.fetch(request.path, {
        method: request.method,
        headers: request.headers || {},
        body: request.body ? JSON.stringify(request.body) : undefined,
        query: request.query || {},
      });
      
      const executionTime = Date.now() - startTime;

      return {
        body: await response.json(),
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        executionTime,
      };
    } catch (error) {
      // If the request fails, return an error response
      const executionTime = Date.now() - startTime;
      
      return {
        body: { error: error.message },
        status: 500,
        headers: {},
        executionTime,
      };
    }
  }
}
