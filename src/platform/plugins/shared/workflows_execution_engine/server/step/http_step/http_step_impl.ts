/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// TODO: Remove eslint exceptions comments and fix the issues
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import https from 'https';
import type { FetcherConfigSchema } from '@kbn/workflows';
import type { HttpGraphNode } from '@kbn/workflows/graph';
import type { z } from '@kbn/zod/v4';
import type { UrlValidator } from '../../lib/url_validator';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { BaseStep, RunStepResult } from '../node_implementation';
import { BaseAtomicNodeImplementation } from '../node_implementation';

type HttpHeaders = Record<string, string | number | boolean>;

/**
 * Fetcher configuration options for customizing HTTP requests
 * Derived from the Zod schema to ensure type safety and avoid duplication
 */
type FetcherOptions = NonNullable<z.infer<typeof FetcherConfigSchema>> & {
  // Allow additional options to be passed through
  [key: string]: any;
};

// Extend BaseStep for HTTP-specific properties
export interface HttpStep extends BaseStep {
  with: {
    url: string;
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    headers?: HttpHeaders;
    body?: any;
    fetcher?: FetcherOptions;
  };
}

export class HttpStepImpl extends BaseAtomicNodeImplementation<HttpStep> {
  constructor(
    node: HttpGraphNode,
    stepExecutionRuntime: StepExecutionRuntime,
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
      stepExecutionRuntime,
      undefined, // no connector executor needed for HTTP
      workflowRuntime
    );
  }

  public getInput() {
    const { url, method = 'GET', headers = {}, body, fetcher } = this.step.with;

    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext({
      url,
      method,
      headers,
      body,
      fetcher,
    });
  }

  protected async _run(input: any): Promise<RunStepResult> {
    try {
      return await this.executeHttpRequest(input);
    } catch (error) {
      return this.handleFailure(input, error);
    }
  }

  private async executeHttpRequest(input?: any): Promise<RunStepResult> {
    const { url, method, headers, body, fetcher: fetcherOptions } = input;

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
      signal: this.stepExecutionRuntime.abortController.signal,
      ...(body && { data: body }),
    };

    // Apply fetcher options if provided
    if (fetcherOptions && Object.keys(fetcherOptions).length > 0) {
      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        skip_ssl_verification,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        follow_redirects,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        max_redirects,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        keep_alive,
      } = fetcherOptions;

      // Configure HTTPS agent for SSL and keep-alive options
      const httpsAgentOptions: https.AgentOptions = {};

      if (skip_ssl_verification) {
        httpsAgentOptions.rejectUnauthorized = false;
      }

      if (keep_alive !== undefined) {
        httpsAgentOptions.keepAlive = keep_alive;
      }

      config.httpsAgent = new https.Agent(httpsAgentOptions);

      // Configure redirect behavior
      if (follow_redirects === false) {
        config.maxRedirects = 0;
      } else if (max_redirects !== undefined) {
        config.maxRedirects = max_redirects;
      }
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
