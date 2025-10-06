/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpGraphNode } from '@kbn/workflows/graph';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { UrlValidator } from '../../lib/url_validator';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';

type HttpHeaders = Record<string, string | number | boolean>;

// Extend BaseStep for HTTP-specific properties
export interface HttpStep extends BaseStep {
  with: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: HttpHeaders;
    body?: any;
  };
}

export class HttpStepImpl extends BaseAtomicNodeImplementation<HttpStep> {
  constructor(
    node: HttpGraphNode,
    contextManager: WorkflowContextManager,
    private workflowLogger: IWorkflowEventLogger,
    private urlValidator: UrlValidator,
    workflowRuntime: WorkflowExecutionRuntimeManager
  ) {
    const httpStep: HttpStep = {
      name: node.configuration.name,
      type: node.type,
      spaceId: '', // TODO: get from context or node
      with: node.configuration.with,
    };
    super(
      httpStep,
      contextManager,
      undefined, // no connector executor needed for HTTP
      workflowRuntime
    );
  }

  public getInput() {
    const context = this.contextManager.getContext();
    const { url, method = 'GET', headers = {}, body } = this.step.with;

    return {
      url: typeof url === 'string' ? this.templatingEngine.render(url, context) : url,
      method,
      headers: this.renderHeaders(headers, context),
      body: this.renderBody(body, context),
    };
  }

  private renderHeaders(headers: HttpHeaders, context: any): HttpHeaders {
    return Object.entries(headers).reduce((acc, [key, value]) => {
      acc[key] = typeof value === 'string' ? this.templatingEngine.render(value, context) : value;
      return acc;
    }, {} as HttpHeaders);
  }

  private renderBody(body: any, context: any): any {
    if (typeof body === 'string') {
      return this.templatingEngine.render(body, context);
    }
    if (body && typeof body === 'object') {
      return this.renderObjectTemplate(body, context);
    }
    return body;
  }

  /**
   * Recursively render the object template.
   * @param obj - The object to render.
   * @param context - The context to use for rendering.
   * @returns The rendered object.
   */
  private renderObjectTemplate(obj: any, context: any): any {
    if (Array.isArray(obj)) {
      return obj.map((item) => this.renderObjectTemplate(item, context));
    }
    if (obj && typeof obj === 'object') {
      return Object.entries(obj).reduce((acc, [key, value]) => {
        acc[key] = this.renderObjectTemplate(value, context);
        return acc;
      }, {} as any);
    }
    if (typeof obj === 'string') {
      return this.templatingEngine.render(obj, context);
    }
    return obj;
  }

  protected async _run(input: any): Promise<RunStepResult> {
    try {
      return await this.executeHttpRequest(input);
    } catch (error) {
      return await this.handleFailure(input, error);
    }
  }

  private async executeHttpRequest(input?: any): Promise<RunStepResult> {
    const { url, method, headers, body } = input;

    // Validate that the URL is allowed based on the allowedHosts configuration
    try {
      this.urlValidator.ensureUrlAllowed(url);
    } catch (error) {
      this.workflowLogger.logError(
        `HTTP request blocked: ${error.message}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          workflow: { step_id: this.step.name },
          event: { action: 'http_request', outcome: 'failure' },
          tags: ['http', 'security', 'blocked'],
        }
      );
      throw error;
    }

    this.workflowLogger.logInfo(`Making HTTP ${method} request to ${url}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'http_request', outcome: 'unknown' },
      tags: ['http', method.toLowerCase()],
    });

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      signal: this.contextManager.abortController.signal,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = body;
    }

    const response: AxiosResponse = await axios(config);

    this.workflowLogger.logInfo(`HTTP request completed with status ${response.status}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'http_request', outcome: 'success' },
      tags: ['http', method.toLowerCase()],
    });

    return {
      input,
      output: {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
      },
      error: undefined,
    };
  }

  protected async handleFailure(input: any, error: any): Promise<RunStepResult> {
    let errorMessage: string;
    let isAborted = false;

    if (axios.isAxiosError(error)) {
      if (error.code === 'ERR_CANCELED') {
        errorMessage = 'HTTP request was cancelled';
        isAborted = true;
      } else if (error.response) {
        errorMessage = `${error.response.status} ${error.response.statusText}`;
      } else {
        errorMessage = `${error.message ? error.message : error.name}`;
      }
    } else if (error instanceof Error) {
      errorMessage = error.message;
      // Check if this is an AbortError
      if (error.name === 'AbortError') {
        isAborted = true;
      }
    } else {
      errorMessage = String(error);
    }

    this.workflowLogger.logError(
      `HTTP request failed: ${errorMessage}`,
      error instanceof Error ? error : new Error(errorMessage),
      {
        workflow: { step_id: this.step.name },
        event: { action: 'http_request', outcome: 'failure' },
        tags: isAborted ? ['http', 'cancelled'] : ['http', 'error'],
      }
    );

    return {
      input,
      output: undefined,
      error: errorMessage,
    };
  }
}
