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
import type { z } from '@kbn/zod/v4';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import { getKibanaUrl } from '../utils';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

// Extend BaseStep for kibana-specific properties
export interface KibanaActionStep extends BaseStep {
  type: string; // e.g., 'kibana.createCase'
  with?: Record<string, any>;
}

/**
 * Fetcher configuration options for customizing HTTP requests
 * Derived from the Zod schema to ensure type safety and avoid duplication
 */
type FetcherOptions = NonNullable<z.infer<typeof FetcherConfigSchema>> & {
  // Allow additional undici Agent options to be passed through
  [key: string]: any;
};

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
    // Support both direct step types (kibana.createCase) and atomic+configuration pattern
    const stepType = this.step.type || (this.step as any).configuration?.type;
    // Use rendered inputs if provided, otherwise fall back to raw step.with or configuration.with
    const stepWith = withInputs || this.step.with || (this.step as any).configuration?.with;
    // Extract meta params (not forwarded as HTTP request params)
    const {
      forceServerInfo = false,
      forceLocalhost = false,
      debug = false,
      ...httpParams
    } = stepWith;

    if (forceServerInfo && forceLocalhost) {
      throw new Error(
        'Cannot set both forceServerInfo and forceLocalhost — they are mutually exclusive. ' +
          'Use forceServerInfo to route via the internal server address, or forceLocalhost to route via localhost:5601.'
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
      const kibanaUrl = this.getKibanaUrl(forceServerInfo, forceLocalhost);
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
        const kibanaUrl = this.getKibanaUrl(forceServerInfo, forceLocalhost);
        failure.error = {
          type: failure.error.type,
          message: failure.error.message,
          details: { ...failure.error.details, _debug: { kibanaUrl } },
        };
      }
      return failure;
    }
  }

  private getKibanaUrl(forceServerInfo = false, forceLocalhost = false): string {
    const coreStart = this.stepExecutionRuntime.contextManager.getCoreStart();
    const { cloudSetup } = this.stepExecutionRuntime.contextManager.getDependencies();
    return getKibanaUrl(coreStart, cloudSetup, forceServerInfo, forceLocalhost);
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
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    return response.json();
  }
}
