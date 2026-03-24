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

import type { FetcherConfigSchema } from '@kbn/workflows';
import { buildKibanaRequest } from '@kbn/workflows';
import type { KibanaGraphNode } from '@kbn/workflows/graph/types';
import { getOutboundEventChainHeaders } from '@kbn/workflows-extensions/server';
import type { z } from '@kbn/zod/v4';
import { ResponseSizeLimitError } from './errors';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import { getKibanaUrl } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Fetcher configuration options for customizing HTTP requests
 * Derived from the Zod schema to ensure type safety and avoid duplication
 */
type FetcherOptions = NonNullable<z.infer<typeof FetcherConfigSchema>> & {
  // Allow additional undici Agent options to be passed through
  [key: string]: any;
};

export class KibanaActionStepImpl extends BaseAtomicNodeImplementation<BaseStep> {
  constructor(
    private node: KibanaGraphNode,
    stepExecutionRuntime: StepExecutionRuntime,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    const step = {
      name: node.stepId,
      type: node.stepType,
      stepId: node.stepId,
      'max-step-size': node.configuration['max-step-size'],
    };
    super(step, stepExecutionRuntime, undefined, workflowRuntime);
  }

  public getInput() {
    const stepWith = this.node.configuration?.with || {};
    return this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(stepWith);
  }

  public async _run(withInputs?: any): Promise<RunStepResult> {
    const stepType = this.node.configuration.type;
    // Use rendered inputs if provided, otherwise fall back to raw configuration.with
    const stepWith = withInputs || this.node.configuration.with;
    // Extract meta params (not forwarded as HTTP request params)
    const {
      use_server_info = false,
      use_localhost = false,
      debug = false,
      ...httpParams
    } = stepWith;

    if (use_server_info && use_localhost) {
      throw new Error(
        'Cannot set both use_server_info and use_localhost — they are mutually exclusive. ' +
          'Use use_server_info to route via the internal server address, or use_localhost to route via localhost:5601.'
      );
    }

    try {
      this.workflowLogger.logInfo(`Executing Kibana action: ${stepType}`, {
        event: { action: 'kibana-action', outcome: 'unknown' },
        tags: ['kibana', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      // Get Kibana base URL (respecting force flags) and authentication
      const kibanaUrl = this.getKibanaUrl(use_server_info, use_localhost);
      const authHeaders = this.getAuthHeaders();

      // Generic approach like Dev Console - just forward the request to Kibana
      const result = await this.executeKibanaRequest(
        kibanaUrl,
        authHeaders,
        stepType,
        httpParams,
        debug
      );

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
      this.workflowLogger.logError(`Kibana action failed: ${stepType}`, error as Error, {
        event: { action: 'kibana-action', outcome: 'failure' },
        tags: ['kibana', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      const failure = this.handleFailure(stepWith, error);
      if (debug && failure.error) {
        const kibanaUrl = this.getKibanaUrl(use_server_info, use_localhost);
        failure.error = {
          type: failure.error.type,
          message: failure.error.message,
          details: { ...failure.error.details, _debug: { kibanaUrl } },
        };
      }
      return failure;
    }
  }

  private getKibanaUrl(use_server_info = false, use_localhost = false): string {
    const coreStart = this.stepExecutionRuntime.contextManager.getCoreStart();
    const { cloudSetup } = this.stepExecutionRuntime.contextManager.getDependencies();
    return getKibanaUrl(coreStart, cloudSetup, use_server_info, use_localhost);
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
      // error
      throw new Error('No authentication headers found');
    }
    return headers;
  }

  private async executeKibanaRequest(
    kibanaUrl: string,
    authHeaders: Record<string, string>,
    stepType: string,
    params: any,
    debug: boolean = false
  ): Promise<any> {
    // Get current space ID from workflow context
    const spaceId = this.stepExecutionRuntime.contextManager.getContext().workflow.spaceId;

    // Extract and remove fetcher configuration from params (it's only for our internal use)
    const { fetcher: fetcherOptions, ...cleanParams } = params;

    // Build the request config from either raw API format or connector definitions
    let requestConfig: {
      method: string;
      path: string;
      body?: any;
      query?: any;
      headers?: Record<string, string>;
    };

    if (cleanParams.request) {
      // Raw API format: { request: { method, path, body, query, headers } } - like Dev Console
      const { method = 'GET', path, body, query, headers: customHeaders } = cleanParams.request;
      requestConfig = { method, path, body, query, headers: { ...authHeaders, ...customHeaders } };
    } else {
      // Use generated connector definitions to determine method and path (covers all 454+ Kibana APIs)
      const {
        method,
        path,
        body,
        query,
        headers: connectorHeaders,
      } = buildKibanaRequest(stepType, cleanParams, spaceId);
      requestConfig = {
        method,
        path,
        body,
        query,
        headers: { ...authHeaders, ...connectorHeaders },
      };
    }

    const result = await this.makeHttpRequest(kibanaUrl, requestConfig, fetcherOptions);

    if (debug) {
      return {
        ...result,
        _debug: {
          fullUrl: this.buildFullUrl(kibanaUrl, requestConfig.path, requestConfig.query),
          method: requestConfig.method,
        },
      };
    }

    return result;
  }

  private buildFullUrl(kibanaUrl: string, path: string, query?: Record<string, string>): string {
    let fullUrl = `${kibanaUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      fullUrl = `${fullUrl}?${new URLSearchParams(query).toString()}`;
    }
    return fullUrl;
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
    fetcherOptions?: FetcherOptions
  ): Promise<any> {
    const { method, path, body, query, headers = {} } = requestConfig;

    // Two paths can lead to emitEvent: (1) In-process: a workflow step (e.g. kibana.createCase) runs in
    // the same process and gets the fakeRequest from step context; getCasesClient(fakeRequest) and later
    // emitEvent(fakeRequest) see the Symbol-set context — no headers needed. (2) Outbound HTTP: this
    // step (kibana.request) sends a new HTTP request; the route handler receives a new request object
    // with no Symbol. Inject these headers so the server can restore context (depth + sourceWorkflowId)
    // and enforce the event-chain depth cap when that handler calls emitEvent.
    const fakeRequest = this.stepExecutionRuntime.contextManager.getFakeRequest();
    const outboundHeaders = { ...headers, ...getOutboundEventChainHeaders(fakeRequest) };

    // Build full URL with query parameters
    let fullUrl = `${kibanaUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      fullUrl = `${fullUrl}?${queryString}`;
    }

    // Build fetch options
    const fetchOptions: RequestInit = {
      method,
      headers: outboundHeaders,
      body: body ? JSON.stringify(body) : undefined,
    };

    // Apply undici Agent with fetcher options
    if (fetcherOptions && Object.keys(fetcherOptions).length > 0) {
      const { Agent } = await import('undici');

      const {
        skip_ssl_verification,
        follow_redirects,
        max_redirects,
        keep_alive,
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

    // Make the HTTP request
    const response = await fetch(fullUrl, fetchOptions);

    if (!response.ok) {
      const errorBody = await this.readStreamWithLimit(response, {
        maxBytes: 1024 * 1024,
        onExceed: 'truncate',
      });
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    if (response.status === 204 || response.status === 304) {
      return {};
    }

    return this.readResponseBody(response);
  }

  /**
   * Reads a fetch Response body as a stream with size enforcement.
   * Delegates to the shared stream reader with 'throw' behavior on size exceeded.
   */
  private async readResponseBody(response: Response): Promise<any> {
    if (!response.body) {
      return null;
    }

    const maxSize = this.getMaxResponseBytes();
    const text = await this.readStreamWithLimit(response, {
      maxBytes: maxSize,
      onExceed: 'throw',
    });
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  /**
   * Reads a Response body stream with a byte-size limit.
   * Two behaviors when the limit is exceeded:
   *  - 'throw': cancels the stream and throws a ResponseSizeLimitError
   *  - 'truncate': cancels the stream and returns the data read so far with a truncation marker
   */
  private async readStreamWithLimit(
    response: Response,
    opts: { maxBytes: number; onExceed: 'throw' | 'truncate' }
  ): Promise<string> {
    if (!response.body) return '';
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (opts.maxBytes > 0 && totalBytes > opts.maxBytes) {
          void reader.cancel();
          if (opts.onExceed === 'throw') {
            throw new ResponseSizeLimitError(opts.maxBytes, this.step.name);
          }
          return `${Buffer.concat(chunks).toString('utf-8')}... [truncated]`;
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    return Buffer.concat(chunks).toString('utf-8');
  }
}
