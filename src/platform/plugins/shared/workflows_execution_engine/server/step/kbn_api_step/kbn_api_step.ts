/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", "GNU Affero General Public License
 * v3.0 only", or "Server Side Public License v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { HttpServer } from '@kbn/core/server';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from '../step_base';
import { StepBase } from '../step_base';
import { WorkflowTemplatingEngine } from '../../templating_engine';

// Kibana API step interface
export interface KbnApiStep extends BaseStep {
  type: 'kibana.request';
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, any>;
  };
}

// Service adapter for Kibana operations
export interface KbnServiceAdapter {
  executeRequest(request: any): Promise<any>;
}

export class KbnServiceAdapterImpl implements KbnServiceAdapter {
  constructor(
    private httpServer: HttpServer,
    private request?: KibanaRequest
  ) {}

  async executeRequest(request: any): Promise<any> {
    const { method, path, headers, body, query } = request;
    
    // Build the request URL
    let url = path;
    if (query) {
      // Handle query parameters properly
      if (typeof query === 'string') {
        url += `?${query}`;
      } else if (typeof query === 'object') {
        const queryParams = new URLSearchParams();
        Object.entries(query).forEach(([key, value]) => {
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

    // For Kibana internal requests, use the internal router
    const response = await this.httpServer.inject({
      method: method.toLowerCase(),
      url,
      headers: headers || {},
      payload: body,
    });
    
    return {
      body: response.result,
      status: response.statusCode,
      headers: response.headers,
    };
  }
}

export class KbnApiStepImpl extends StepBase<KbnApiStep> {
  private kbnServiceAdapter: KbnServiceAdapter;

  constructor(
    step: KbnApiStep,
    contextManager: WorkflowContextManager,
    workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    httpServer: HttpServer,
    request?: KibanaRequest
  ) {
    super(step, contextManager, undefined, workflowState);
    
    this.kbnServiceAdapter = new KbnServiceAdapterImpl(httpServer, request);
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

      // Render the request with context
      const renderedRequest = this.renderRequest(step.request, context);

      // Execute the Kibana request
      const startTime = Date.now();
      const response = await this.kbnServiceAdapter.executeRequest(renderedRequest);
      const executionTime = Date.now() - startTime;

      // Log the execution
      this.workflowLogger.logInfo(
        `Kibana API step ${step.name} executed successfully`,
        {
          event: { action: 'kibana.request', outcome: 'success' },
          tags: ['kbn-api', 'kibana'],
          kibana: {
            step: {
              name: step.name,
              type: step.type,
              method: renderedRequest.method,
              path: renderedRequest.path,
            },
          },
        }
      );

      return {
        output: {
          response: response.body,
          status: response.status,
          headers: response.headers,
          executionTime,
        },
        error: undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.workflowLogger.logError(
        `Kibana API step ${this.step.name} failed: ${errorMessage}`,
        {
          event: { action: 'kibana.request', outcome: 'failure' },
          tags: ['kbn-api', 'kibana', 'error'],
          kibana: {
            step: {
              name: this.step.name,
              type: this.step.type,
            },
          },
        }
      );

      return {
        output: undefined,
        error: errorMessage,
      };
    }
  }

  private renderRequest(request: any, context: any): any {
    return {
      method: request.method,
      path: this.templatingEngine.render(request.path, context),
      headers: request.headers ? this.renderObject(request.headers, context) : undefined,
      body: request.body ? this.renderObject(request.body, context) : undefined,
      query: request.query ? this.renderObject(request.query, context) : undefined,
    };
  }

  private renderObject(obj: any, context: any): any {
    if (typeof obj === 'string') {
      return this.templatingEngine.render(obj, context);
    } else if (Array.isArray(obj)) {
      return obj.map(item => this.renderObject(item, context));
    } else if (obj && typeof obj === 'object') {
      const rendered: any = {};
      for (const [key, value] of Object.entries(obj)) {
        rendered[key] = this.renderObject(value, context);
      }
      return rendered;
    }
    return obj;
  }
}
