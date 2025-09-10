/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { RunStepResult, BaseStep } from './step_base';
import { StepBase } from './step_base';

// Extend BaseStep for kibana-specific properties
export interface KibanaActionStep extends BaseStep {
  type: string; // e.g., 'kibana.cases.create'
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

  public async _run(): Promise<RunStepResult> {
    try {
      // Support both direct step types (kibana.cases.create) and atomic+configuration pattern
      const stepType = this.step.type || (this.step as any).configuration?.type;
      const stepWith = this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logInfo(`Executing Kibana action: ${stepType}`, {
        event: { action: 'kibana-action', outcome: 'unknown' },
        tags: ['kibana', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      // Get fakeRequest for authentication (created by Task Manager from taskInstance.apiKey)
      const fakeRequest = this.contextManager.getFakeRequest();
      if (!fakeRequest) {
        throw new Error(
          'Kibana actions require API key authentication. Execute workflow with apiKey in context: executeWorkflow(workflow, { apiKey: "your-api-key", apiKeyId: "key-id", ... })'
        );
      }

      // Check if the fake request has proper authentication
      const authHeader = fakeRequest.headers?.authorization;
      if (!authHeader || !authHeader.toString().startsWith('ApiKey ')) {
        throw new Error(
          'Invalid API key authentication. Ensure workflow was executed with a valid API key.'
        );
      }

      // Log fakeRequest details for debugging user context
      this.workflowLogger.logDebug(`FakeRequest details for user context`, {
        event: { action: 'debug-fake-request', outcome: 'unknown' },
        tags: ['kibana', 'internal-action', 'debug'],
        labels: {
          has_auth: !!fakeRequest.auth,
          has_credentials: !!fakeRequest.auth?.credentials,
          username: fakeRequest.auth?.credentials?.username || 'unknown',
          space_id: fakeRequest.params?.spaceId,
          headers_count: Object.keys(fakeRequest.headers || {}).length,
        },
      });

      let result: any;

      // Handle different Kibana action types
      if (stepType.startsWith('kibana.cases') || stepType === 'kibana.addCaseCommentDefaultSpace') {
        result = await this.executeCasesAction(stepType, stepWith, fakeRequest);
      } else if (stepType.startsWith('kibana.spaces')) {
        result = await this.executeSpacesAction(stepType, stepWith, fakeRequest);
      } else if (stepType.startsWith('kibana.alerts')) {
        result = await this.executeAlertsAction(stepType, stepWith, fakeRequest);
      } else {
        // Generic Kibana API operation
        result = await this.executeGenericKibanaAction(stepType, stepWith, fakeRequest);
      }

      this.workflowLogger.logInfo(`Kibana action completed: ${stepType}`, {
        event: { action: 'kibana-action', outcome: 'success' },
        tags: ['kibana', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });

      return { output: result, error: undefined };
    } catch (error) {
      const stepType = (this.step as any).configuration?.type || this.step.type;

      this.workflowLogger.logError(`Kibana action failed: ${stepType}`, error as Error, {
        event: { action: 'kibana-action', outcome: 'failure' },
        tags: ['kibana', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'kibana',
        },
      });
      return await this.handleFailure(error);
    }
  }

  private async executeCasesAction(stepType: string, params: any, fakeRequest: any): Promise<any> {
    if (params.request) {
      // Raw API format: { request: { method, path, body } }
      return await this.makeHttpRequest(params.request, fakeRequest);
    } else {
      // Sugar syntax for cases
      if (stepType === 'kibana.cases.create') {
        return await this.makeHttpRequest(
          {
            method: 'POST',
            path: '/api/cases',
            body: {
              title: params.title,
              description: params.description,
              tags: params.tags || [],
              severity: params.severity || 'low',
              assignees: params.assignees || [],
              owner: params.owner || 'cases', // Default to 'cases' application
              connector: params.connector || {
                id: 'none',
                name: 'none',
                type: '.none',
                fields: null,
              },
              settings: params.settings || {
                syncAlerts: true,
              },
              ...params,
            },
          },
          fakeRequest
        );
      } else if (stepType === 'kibana.cases.get') {
        const caseId = params.id || params.case_id;
        if (!caseId) throw new Error('Case ID is required for kibana.cases.get');
        return await this.makeHttpRequest(
          {
            method: 'GET',
            path: `/api/cases/${caseId}`,
          },
          fakeRequest
        );
      } else if (stepType === 'kibana.cases.list') {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.perPage) queryParams.append('perPage', params.perPage.toString());
        if (params.status) queryParams.append('status', params.status);

        const queryString = queryParams.toString();
        return await this.makeHttpRequest(
          {
            method: 'GET',
            path: `/api/cases/_find${queryString ? `?${queryString}` : ''}`,
          },
          fakeRequest
        );
      } else if (stepType === 'kibana.addCaseCommentDefaultSpace') {
        const caseId = params.caseId;
        if (!caseId) throw new Error('Case ID is required for kibana.addCaseCommentDefaultSpace');
        
        // Build body only with provided parameters, don't include undefined values
        const body: any = {};
        
        // Determine comment type based on provided parameters
        if (params.alertId !== undefined || params.index !== undefined || params.rule !== undefined) {
          // Alert comment - requires alertId, index, owner, rule, type
          body.type = 'alert';
          if (params.alertId !== undefined) body.alertId = params.alertId;
          if (params.index !== undefined) body.index = params.index;
          if (params.owner !== undefined) body.owner = params.owner;
          if (params.rule !== undefined) body.rule = params.rule;
        } else if (params.comment !== undefined) {
          // User comment - requires comment, owner, type
          body.type = 'user';
          body.comment = params.comment;
          body.owner = params.owner || 'cases'; // Default to 'cases' if not specified
        } else {
          // Explicit type provided
          if (params.type !== undefined) body.type = params.type;
          if (params.alertId !== undefined) body.alertId = params.alertId;
          if (params.index !== undefined) body.index = params.index;
          if (params.owner !== undefined) body.owner = params.owner;
          if (params.rule !== undefined) body.rule = params.rule;
          if (params.comment !== undefined) body.comment = params.comment;
        }
        
        return await this.makeHttpRequest(
          {
            method: 'POST',
            path: `/api/cases/${caseId}/comments`,
            body,
          },
          fakeRequest
        );
      } else {
        throw new Error(`Unsupported cases action: ${stepType}`);
      }
    }
  }

  private async executeSpacesAction(stepType: string, params: any, fakeRequest: any): Promise<any> {
    if (params.request) {
      return await this.makeHttpRequest(params.request, fakeRequest);
    } else {
      if (stepType === 'kibana.spaces.get') {
        const spaceId = params.id || params.space_id;
        return await this.makeHttpRequest(
          {
            method: 'GET',
            path: spaceId ? `/api/spaces/space/${spaceId}` : '/api/spaces/space',
          },
          fakeRequest
        );
      } else if (stepType === 'kibana.spaces.list') {
        return await this.makeHttpRequest(
          {
            method: 'GET',
            path: '/api/spaces/space',
          },
          fakeRequest
        );
      } else {
        throw new Error(`Unsupported spaces action: ${stepType}`);
      }
    }
  }

  private async executeAlertsAction(stepType: string, params: any, fakeRequest: any): Promise<any> {
    if (params.request) {
      return await this.makeHttpRequest(params.request, fakeRequest);
    } else {
      if (stepType === 'kibana.alerts.find') {
        return await this.makeHttpRequest(
          {
            method: 'POST',
            path: '/internal/rac/alerts/find',
            body: params,
          },
          fakeRequest
        );
      } else {
        throw new Error(`Unsupported alerts action: ${stepType}`);
      }
    }
  }

  private async executeGenericKibanaAction(
    stepType: string,
    params: any,
    fakeRequest: any
  ): Promise<any> {
    if (params.request) {
      // Raw API format - always works
      return await this.makeHttpRequest(params.request, fakeRequest);
    } else {
      throw new Error(
        `Unsupported Kibana action: ${stepType}. Use raw API format with 'request' parameter.`
      );
    }
  }

  private async makeHttpRequest(requestConfig: any, fakeRequest: any): Promise<any> {
    const { method, path, body, headers: customHeaders } = requestConfig;

    // Extract authorization from fakeRequest - may not be present for basic fake requests
    const authHeader = fakeRequest.headers?.authorization;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'true',
      ...customHeaders,
    };

    // Add authorization header - use basic auth for demo
    const basicAuth = Buffer.from('elastic:changeme').toString('base64');
    headers.Authorization = `Basic ${basicAuth}`;

    // Try to get user context from workflow for user attribution
    const context = this.contextManager.getContext();
    if (context.user?.username) {
      headers['x-elastic-workflow-user'] = context.user.username;
    }

    // Use Node.js fetch (available in Node 18+) or require a fetch implementation
    const response = await fetch(`http://localhost:5601${path}`, {
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
