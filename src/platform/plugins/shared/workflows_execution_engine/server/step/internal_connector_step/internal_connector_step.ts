/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from '../step_base';
import { StepBase } from '../step_base';
import { WorkflowTemplatingEngine } from '../../templating_engine';

// Extend BaseStep for internal connector-specific properties
export interface InternalConnectorStep extends BaseStep {
  type: 'elasticsearch.request' | 'kibana.request';
  request: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'HEAD' | 'OPTIONS';
    path: string;
    headers?: Record<string, string>;
    body?: any;
    query?: Record<string, string>;
  };
}

export class InternalConnectorStepImpl extends StepBase<InternalConnectorStep> {
  private core: CoreStart;
  private request?: KibanaRequest;

  constructor(
    step: InternalConnectorStep,
    contextManager: WorkflowContextManager,
    workflowState: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    core: CoreStart,
    request?: KibanaRequest
  ) {
    super(step, contextManager, undefined, workflowState);
    this.core = core;
    this.request = request;
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

      // Execute the request based on type
      let response: any;
      let executionTime: number;

      if (step.type === 'elasticsearch.request') {
        response = await this.executeElasticsearchRequest(renderedRequest);
      } else if (step.type === 'kibana.request') {
        response = await this.executeKibanaRequest(renderedRequest);
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
          executionTime: response.executionTime,
        },
        error: undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.workflowLogger.logError(
        `Internal connector step ${this.step.name} failed: ${errorMessage}`,
        {
          event: { action: this.step.type, outcome: 'failure' },
          tags: ['internal-connector', this.step.type, 'error'],
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

  private async executeElasticsearchRequest(request: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const { method, path, headers, body, query } = request;
      
      // Use scoped client with proper permissions if request is available
      let esClient;
      if (this.request) {
        // Use scoped client with user permissions
        esClient = this.core.elasticsearch.client.asScoped(this.request).asCurrentUser;
      } else {
        // Fallback to internal user for system operations
        esClient = this.core.elasticsearch.client.asInternalUser;
      }
      
      // Build the request options following Kibana's established patterns
      const requestOptions: any = {
        method: method.toLowerCase(),
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
      throw new Error(`Elasticsearch request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async executeKibanaRequest(request: any): Promise<any> {
    const startTime = Date.now();
    
    try {
      const { method, path, headers, body, query } = request;
      
      // For now, we'll use a simplified approach since Kibana's internal HTTP
      // routing is complex and requires proper router setup
      // TODO: Implement proper Kibana internal request handling
      
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

      // For now, return a mock response since proper Kibana internal routing
      // requires router setup and context that we don't have here
      const executionTime = Date.now() - startTime;

      return {
        body: { message: 'Kibana internal requests not yet implemented' },
        status: 501, // Not Implemented
        headers: {},
        executionTime,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      throw new Error(`Kibana request failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
