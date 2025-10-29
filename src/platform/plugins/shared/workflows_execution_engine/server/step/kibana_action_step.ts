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

import { buildKibanaRequestFromAction } from '@kbn/workflows';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

// Extend BaseStep for kibana-specific properties
export interface KibanaActionStep extends BaseStep {
  type: string; // e.g., 'kibana.createCaseDefaultSpace'
  with?: Record<string, any>;
}

export class KibanaActionStepImpl extends BaseAtomicNodeImplementation<KibanaActionStep> {
  constructor(
    step: KibanaActionStep,
    stepExecutionRuntime: StepExecutionRuntime,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, stepExecutionRuntime, undefined, workflowRuntime);
  }

  public getInput() {
    // Render inputs from 'with' - support both direct step.with and step.configuration.with
    const stepWith = this.step.with || (this.step as any).configuration?.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(stepWith);
  }

  public async _run(withInputs?: any): Promise<RunStepResult> {
    try {
      // Support both direct step types (kibana.createCaseDefaultSpace) and atomic+configuration pattern
      const stepType = this.step.type || (this.step as any).configuration?.type;
      // Use rendered inputs if provided, otherwise fall back to raw step.with or configuration.with
      const stepWith = withInputs || this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logInfo(`Executing Kibana action: ${stepType}`, {
        event: { action: 'kibana-action', outcome: 'unknown' },
        tags: ['kibana', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      // Get Kibana base URL and authentication
      const kibanaUrl = this.getKibanaUrl();
      const authHeaders = this.getAuthHeaders();

      // Generic approach like Dev Console - just forward the request to Kibana
      const result = await this.executeKibanaRequest(kibanaUrl, authHeaders, stepType, stepWith);

      this.workflowLogger.logInfo(`Kibana action completed: ${stepType}`, {
        event: { action: 'kibana-action', outcome: 'success' },
        tags: ['kibana', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      return { input: stepWith, output: result, error: undefined };
    } catch (error) {
      const stepType = (this.step as any).configuration?.type || this.step.type;
      const stepWith = withInputs || this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logError(`Kibana action failed: ${stepType}`, error as Error, {
        event: { action: 'kibana-action', outcome: 'failure' },
        tags: ['kibana', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });
      return this.handleFailure(stepWith, error);
    }
  }

  private getKibanaUrl(): string {
    // Get Kibana URL from server.publicBaseUrl config if available
    const coreStart = this.stepExecutionRuntime.contextManager.getCoreStart();
    if (coreStart?.http?.basePath?.publicBaseUrl) {
      return coreStart.http.basePath.publicBaseUrl;
    }
    // Get Kibana URL from cloud.kibanaUrl config if available
    const { cloudSetup } = this.stepExecutionRuntime.contextManager.getDependencies();
    if (cloudSetup?.kibanaUrl) {
      return cloudSetup.kibanaUrl;
    }

    // Fallback to local network binding
    const http = coreStart?.http;
    if (http) {
      const { protocol, hostname, port } = http.getServerInfo();
      return `${protocol}://${hostname}:${port}${http.basePath
        // Prepending on '' removes the serverBasePath
        .prepend('/')
        .slice(0, -1)}`;
    }

    // Fallback to localhost for development
    return 'http://localhost:5601';
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
    };

    // Get fakeRequest for authentication (created by Task Manager from taskInstance.apiKey)
    const fakeRequest = this.stepExecutionRuntime.contextManager.getFakeRequest();
    if (fakeRequest?.headers?.authorization) {
      // Use API key from fakeRequest if available
      headers.Authorization = fakeRequest.headers.authorization.toString();
    } else {
      // Fallback to basic auth for development
      const basicAuth = Buffer.from('elastic:changeme').toString('base64');
      headers.Authorization = `Basic ${basicAuth}`;
    }

    // Note: User context is not available in KibanaRequestAuth interface
    // Could be added in the future if needed for user attribution

    return headers;
  }

  private async executeKibanaRequest(
    kibanaUrl: string,
    authHeaders: Record<string, string>,
    stepType: string,
    params: any
  ): Promise<any> {
    // Get current space ID from workflow context
    const spaceId = this.stepExecutionRuntime.contextManager.getContext().workflow.spaceId;

    // Extract and remove fetcher configuration from params (it's only for our internal use)
    const { fetcher: fetcherOptions, ...cleanParams } = params;

    // Support both raw API format and connector-driven syntax
    if (cleanParams.request) {
      // Raw API format: { request: { method, path, body, query, headers } } - like Dev Console
      const { method = 'GET', path, body, query, headers: customHeaders } = cleanParams.request;
      return this.makeHttpRequest(
        kibanaUrl,
        {
          method,
          path,
          body,
          query,
          headers: { ...authHeaders, ...customHeaders },
        },
        fetcherOptions
      );
    } else {
      // Use generated connector definitions to determine method and path (covers all 454+ Kibana APIs)
      const {
        method,
        path,
        body,
        query,
        headers: connectorHeaders,
      } = buildKibanaRequestFromAction(stepType, cleanParams, spaceId);

      return this.makeHttpRequest(
        kibanaUrl,
        {
          method,
          path,
          body,
          query,
          headers: { ...authHeaders, ...connectorHeaders },
        },
        fetcherOptions
      );
    }
  }

  private async makeHttpRequest(
    kibanaUrl: string,
    requestConfig: {
      method: string;
      path: string;
      body?: any;
      query?: any;
      headers?: Record<string, string>;
    },
    fetcherOptions?: Record<string, any>
  ): Promise<any> {
    const { method, path, body, query, headers = {} } = requestConfig;

    // Build full URL with query parameters
    let fullUrl = `${kibanaUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      fullUrl = `${fullUrl}?${queryString}`;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Apply undici Agent with all fetcher options
    if (fetcherOptions && Object.keys(fetcherOptions).length > 0) {
      const { Agent } = await import('undici');

      const {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        skip_ssl_verification, // eslint-disable-next-line @typescript-eslint/naming-convention
        follow_redirects, // eslint-disable-next-line @typescript-eslint/naming-convention
        max_redirects, // eslint-disable-next-line @typescript-eslint/naming-convention
        keep_alive,
        timeout,
        retry,
        ...otherOptions
      } = fetcherOptions;

      const agentOptions: any = { ...otherOptions };

      // Map our options to undici Agent options
      if (skip_ssl_verification) {
        agentOptions.connect = { ...(agentOptions.connect || {}), rejectUnauthorized: false };
      }
      if (max_redirects !== undefined) {
        agentOptions.maxRedirections = max_redirects;
      }
      if (keep_alive !== undefined) {
        agentOptions.keepAliveTimeout = keep_alive ? 60000 : 0;
        agentOptions.keepAliveMaxTimeout = keep_alive ? 600000 : 0;
      }

      (fetchOptions as any).dispatcher = new Agent(agentOptions);

      // Handle redirect at fetch level
      if (follow_redirects === false) {
        fetchOptions.redirect = 'manual';
      }
    }

    // Setup timeout if configured
    let timeoutId: NodeJS.Timeout | undefined;
    if (fetcherOptions?.timeout) {
      const controller = new AbortController();
      timeoutId = setTimeout(() => controller.abort(), fetcherOptions.timeout);
      fetchOptions.signal = controller.signal;
    }

    // Execute with retry logic
    return this.executeWithRetry(fullUrl, fetchOptions, fetcherOptions?.retry, timeoutId);
  }

  private async executeWithRetry(
    url: string,
    fetchOptions: RequestInit,
    retryConfig?: Record<string, any>,
    timeoutId?: NodeJS.Timeout
  ): Promise<any> {
    const maxAttempts = retryConfig?.attempts ?? 1;
    const retryDelay = retryConfig?.delay ?? 1000;
    const backoffStrategy = retryConfig?.backoff ?? 'linear';
    const retryOnStatuses = retryConfig?.retryOn ?? [502, 503, 504];

    let lastError: any;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(url, fetchOptions);

        if (timeoutId) clearTimeout(timeoutId);

        // Retry on specific status codes
        if (
          !response.ok &&
          attempt < maxAttempts - 1 &&
          retryOnStatuses.includes(response.status)
        ) {
          const delay =
            backoffStrategy === 'exponential' ? retryDelay * Math.pow(2, attempt) : retryDelay;
          this.workflowLogger.logInfo(
            `Retrying request (attempt ${
              attempt + 1
            }/${maxAttempts}) after ${delay}ms due to status ${response.status}`,
            { event: { action: 'kibana-action', outcome: 'unknown' }, tags: ['kibana', 'retry'] }
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
          // eslint-disable-next-line no-continue
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error;
        if (timeoutId) clearTimeout(timeoutId);

        // If this is the last attempt, throw
        if (attempt === maxAttempts - 1) throw error;

        // Check if this is an HTTP error with a status code
        const isHttpError = error instanceof Error && error.message.startsWith('HTTP ');
        if (isHttpError) {
          // Extract status code from error message
          const statusMatch = error.message.match(/^HTTP (\d+):/);
          if (statusMatch) {
            const statusCode = parseInt(statusMatch[1], 10);
            // Don't retry if status code is not in retryOn list
            if (!retryOnStatuses.includes(statusCode)) {
              throw error;
            }
          }
        }

        // Retry on network errors or retryable HTTP errors
        const delay =
          backoffStrategy === 'exponential' ? retryDelay * Math.pow(2, attempt) : retryDelay;
        this.workflowLogger.logInfo(
          `Retrying request (attempt ${attempt + 1}/${maxAttempts}) after ${delay}ms due to error`,
          { event: { action: 'kibana-action', outcome: 'unknown' }, tags: ['kibana', 'retry'] }
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw lastError;
  }
}
