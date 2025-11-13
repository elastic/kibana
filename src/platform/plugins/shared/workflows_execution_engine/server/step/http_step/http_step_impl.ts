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
// -------------------------------------------------------------
  private async executeHttpRequest(input?: any): Promise<RunStepResult> {
    const { url, method, headers, body, fetcher: fetcherOptions } = input;

    // Resolve workplace connector secret references if available
    const dependencies = this.stepExecutionRuntime.contextManager.getDependencies();
    const coreStart = this.stepExecutionRuntime.contextManager.getCoreStart();
    const fakeRequest = this.stepExecutionRuntime.contextManager.getFakeRequest();

    let finalUrl: string = url;
    let finalHeaders: HttpHeaders | undefined = headers;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let finalBody: any = body;

    if (dependencies?.secretResolver && coreStart && fakeRequest) {
      const savedObjectsClient = coreStart.savedObjects.getScopedClient(fakeRequest);
      const context = this.stepExecutionRuntime.contextManager.getContext?.();
      const namespace =
        (context as any)?.workflow?.spaceId ||
        (savedObjectsClient as any).getCurrentNamespace?.() ||
        ((fakeRequest as any).headers?.['x-elastic-project-id'] as string | undefined);

      // Resolve URL secrets
      if (typeof finalUrl === 'string') {
        finalUrl = await dependencies.secretResolver.resolveSecrets(
          finalUrl,
          savedObjectsClient,
          namespace
        );
      }

      // Resolve headers secrets
      if (finalHeaders && typeof finalHeaders === 'object') {
        // TEMP DEBUG: Log original headers before resolution
        this.workflowLogger.logInfo(
          `[HttpStep] DEBUG: Original headers before secret resolution: ${JSON.stringify(finalHeaders)}`,
          {
            workflow: { step_id: this.step.name },
            event: { action: 'http_request', outcome: 'unknown' },
            tags: ['http', 'debug'],
          }
        );
        const resolvedHeaders = await dependencies.secretResolver.resolveSecretsInObject(
          finalHeaders as unknown as Record<string, unknown>,
          savedObjectsClient,
          namespace
        );
        finalHeaders = resolvedHeaders as unknown as HttpHeaders;
        // TEMP DEBUG: Log resolved headers (mask Authorization token)
        const debugHeaders = { ...finalHeaders };
        if (debugHeaders.Authorization) {
          const authValue = String(debugHeaders.Authorization);
          const preview = authValue.length > 30 
            ? `${authValue.substring(0, 20)}...${authValue.substring(authValue.length - 10)}`
            : authValue.substring(0, Math.min(20, authValue.length)) + '...';
          debugHeaders.Authorization = `[MASKED: ${preview}]`;
        }
        this.workflowLogger.logInfo(
          `[HttpStep] DEBUG: Resolved headers after secret resolution: ${JSON.stringify(debugHeaders)}`,
          {
            workflow: { step_id: this.step.name },
            event: { action: 'http_request', outcome: 'unknown' },
            tags: ['http', 'debug'],
          }
        );
      }

      // Resolve body secrets
      if (typeof finalBody === 'string') {
        finalBody = await dependencies.secretResolver.resolveSecrets(
          finalBody,
          savedObjectsClient,
          namespace
        );
      } else if (finalBody && typeof finalBody === 'object') {
        finalBody = await dependencies.secretResolver.resolveSecretsInObject(
          finalBody as Record<string, unknown>,
          savedObjectsClient,
          namespace
        );
      }
    }

    // Validate that the URL is allowed based on the allowedHosts configuration
    try {
      this.urlValidator.ensureUrlAllowed(finalUrl);
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

    // Log without exposing resolved secrets; use original URL with placeholders
    this.workflowLogger.logInfo(`Making HTTP ${method} request to ${url}`, {
      workflow: { step_id: this.step.name },
      event: { action: 'http_request', outcome: 'unknown' },
      tags: ['http', method.toLowerCase()],
    });

    const config: AxiosRequestConfig = {
      url: finalUrl,
      method,
      headers: finalHeaders,
      signal: this.stepExecutionRuntime.abortController.signal,
    };

    if (finalBody && ['POST', 'PUT', 'PATCH'].includes(method)) {
      config.data = finalBody;
    }

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

  // -------------------------------------------------------------

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