/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { buildKibanaRequestFromAction } from '@kbn/workflows';
import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from './step_base';
import { StepBase } from './step_base';

// Extend BaseStep for kibana-specific properties
export interface KibanaActionStep extends BaseStep {
  type: string; // e.g., 'kibana.createCaseDefaultSpace'
  with?: Record<string, any>;
}

export class KibanaActionStepImpl extends StepBase<KibanaActionStep> {
  constructor(
    step: KibanaActionStep,
    contextManager: WorkflowContextManager,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowRuntime);
  }

  public getInput() {
    // Get current context for templating
    const context = this.contextManager.getContext();
    // Render inputs from 'with' - support both direct step.with and step.configuration.with
    const stepWith = this.step.with || (this.step as any).configuration?.with || {};
    return Object.entries(stepWith).reduce((acc: Record<string, any>, [key, value]) => {
      if (typeof value === 'string') {
        acc[key] = this.templatingEngine.render(value, context);
      } else {
        acc[key] = value;
      }
      return acc;
    }, {});
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
      return await this.handleFailure(stepWith, error);
    }
  }

  private getKibanaUrl(): string {
    // Get Kibana URL from CoreStart if available
    const coreStart = this.contextManager.getCoreStart();
    if (coreStart?.http?.basePath?.publicBaseUrl) {
      return coreStart.http.basePath.publicBaseUrl;
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
    const fakeRequest = this.contextManager.getFakeRequest();
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
    // Support both raw API format and connector-driven syntax
    if (params.request) {
      // Raw API format: { request: { method, path, body, query, headers } } - like Dev Console
      const { method = 'GET', path, body, query, headers: customHeaders } = params.request;
      return await this.makeHttpRequest(kibanaUrl, {
        method,
        path,
        body,
        query,
        headers: { ...authHeaders, ...customHeaders },
      });
    } else {
      // Use generated connector definitions to determine method and path (covers all 454+ Kibana APIs)
      const {
        method,
        path,
        body,
        query,
        headers: connectorHeaders,
      } = buildKibanaRequestFromAction(stepType, params);

      return await this.makeHttpRequest(kibanaUrl, {
        method,
        path,
        body,
        query,
        headers: { ...authHeaders, ...connectorHeaders },
      });
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
    }
  ): Promise<any> {
    const { method, path, body, query, headers = {} } = requestConfig;

    // Build full URL with query parameters
    let fullUrl = `${kibanaUrl}${path}`;
    if (query && Object.keys(query).length > 0) {
      const queryString = new URLSearchParams(query).toString();
      fullUrl = `${fullUrl}?${queryString}`;
    }

    const response = await fetch(fullUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const responseData = await response.json();
    return responseData;
  }
}
