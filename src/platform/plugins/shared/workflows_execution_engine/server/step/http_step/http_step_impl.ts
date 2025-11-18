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

import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import https from 'https';
import type { ExecutionError, FetcherConfigSchema } from '@kbn/workflows';
import type { HttpGraphNode } from '@kbn/workflows/graph';
import type { z } from '@kbn/zod';
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
    let executionError: ExecutionError;

    if (axios.isAxiosError(error)) {
      executionError = this.mapAxiosError(error);
    }
    // else if (error instanceof AggregateError) {
    //   executionError = {
    //     type: 'AggregateError',
    //     message: error.message,
    //     details: error.errors.map((err) =>
    //       err instanceof Error
    //         ? { type: err.name, message: err.message }
    //         : { type: 'UnknownError', message: String(err) }
    //     ),
    //   };
    // }
    else if (error instanceof Error) {
      executionError = {
        type: error.name,
        message: error.message,
      };
    } else {
      executionError = {
        type: 'UnknownError',
        message: String(error),
      };
    }

    // this.workflowLogger.logError(
    //   `HTTP request failed: ${executionError.message}`,
    //   error instanceof Error ? error : new Error(errorMessage),
    //   {
    //     workflow: { step_id: this.step.name },
    //     event: { action: 'http_request', outcome: 'failure' },
    //     tags: ['http', 'error', executionError.type],
    //   }
    // );

    return {
      input,
      output: undefined,
      error: executionError,
    };
  }

  private mapAxiosError(error: AxiosError): ExecutionError {
    if (error.code === 'ECONNREFUSED') {
      const url = new URL(this.step.with.url);
      return {
        type: 'ConnectionRefused',
        message: `Connection refused to ${url.origin}`,
      };
    }

    if (error.response) {
      return {
        type: 'HttpRequestError',
        message: error.message,
        details: {
          headers: error.response.headers,
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
        },
      };
    }

    return {
      type: error.code || 'UnknownHttpRequestError',
      message: error.message,
      details: error.config && {
        config: error.config,
      },
    };
  }
}
