/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpGraphNode } from '@kbn/workflows';
import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { UrlValidator } from '../../lib/url_validator';
import { WorkflowTemplatingEngine } from '../../templating_engine';
import type { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { StepImplementation } from '../step_base';

type HttpHeaders = Record<string, string | number | boolean>;

export class HttpStepImpl implements StepImplementation {
  private templatingEngine: WorkflowTemplatingEngine;

  constructor(
    private node: HttpGraphNode,
    private contextManager: WorkflowContextManager,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private urlValidator: UrlValidator
  ) {
    this.templatingEngine = new WorkflowTemplatingEngine();
  }

  public getInput() {
    const context = this.contextManager.getContext();
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 30000,
    } = this.node.configuration.with;

    return {
      url: typeof url === 'string' ? this.templatingEngine.render(url, context) : url,
      method,
      headers: this.renderHeaders(headers, context),
      body: this.renderBody(body, context),
      timeout,
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

  async run(): Promise<void> {
    await this.workflowRuntime.startStep(this.node.id);

    const input = this.getInput();

    try {
      const result = await this.executeHttpRequest(input);
      await this.workflowRuntime.setStepResult(result);
    } catch (error) {
      const result = await this.handleFailure(input, error);
      await this.workflowRuntime.setStepResult(result);
    } finally {
      await this.workflowRuntime.finishStep(this.node.id);
    }

    this.workflowRuntime.goToNextStep();
  }

  private async executeHttpRequest(input?: any): Promise<any> {
    const { url, method, headers, body, timeout } = input;

    // Validate that the URL is allowed based on the allowedHosts configuration
    try {
      this.urlValidator.ensureUrlAllowed(url);
    } catch (error) {
      this.workflowLogger.logError(
        `HTTP request blocked: ${error.message}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          workflow: { step_id: this.node.configuration.name },
          event: { action: 'http_request', outcome: 'failure' },
          tags: ['http', 'security', 'blocked'],
        }
      );
      throw error;
    }

    this.workflowLogger.logInfo(`Making HTTP ${method} request to ${url}`, {
      workflow: { step_id: this.node.configuration.name },
      event: { action: 'http_request', outcome: 'unknown' },
      tags: ['http', method.toLowerCase()],
    });

    const config: AxiosRequestConfig = {
      url,
      method,
      headers,
      timeout,
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = body;
    }

    const response: AxiosResponse = await axios(config);

    this.workflowLogger.logInfo(`HTTP request completed with status ${response.status}`, {
      workflow: { step_id: this.node.configuration.name },
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

  private async handleFailure(input: any, error: any): Promise<any> {
    const errorMessage = axios.isAxiosError(error)
      ? error.response
        ? `HTTP Error: ${error.response.status} ${error.response.statusText}`
        : `HTTP Error: ${error.message}`
      : error instanceof Error
      ? error.message
      : String(error);

    this.workflowLogger.logError(
      `HTTP request failed: ${errorMessage}`,
      error instanceof Error ? error : new Error(errorMessage),
      {
        workflow: { step_id: this.node.configuration.name },
        event: { action: 'http_request', outcome: 'failure' },
        tags: ['http', 'error'],
      }
    );

    return {
      input,
      output: undefined,
      error: errorMessage,
    };
  }
}
