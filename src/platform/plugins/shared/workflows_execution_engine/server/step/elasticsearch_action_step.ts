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
import { GENERATED_ELASTICSEARCH_CONNECTORS } from '../../../workflows_management/common/generated_es_connectors';

// Extend BaseStep for elasticsearch-specific properties
export interface ElasticsearchActionStep extends BaseStep {
  type: string; // e.g., 'elasticsearch.search.query'
  with?: Record<string, any>;
}

export class ElasticsearchActionStepImpl extends StepBase<ElasticsearchActionStep> {
  constructor(
    step: ElasticsearchActionStep,
    contextManager: WorkflowContextManager,
    workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowRuntime);
  }

  public async _run(): Promise<RunStepResult> {
    try {
      // Support both direct step types (elasticsearch.search.query) and atomic+configuration pattern
      const stepType = this.step.type || (this.step as any).configuration?.type;
      const stepWith = this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logInfo(`Executing Elasticsearch action: ${stepType}`, {
        event: { action: 'elasticsearch-action', outcome: 'unknown' },
        tags: ['elasticsearch', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });

      // Get ES client (user-scoped if available, fallback otherwise)
      const esClient = this.contextManager.getEsClientAsUser();

      // Generic approach like Dev Console - just forward the request to ES
      const result = await this.executeElasticsearchRequest(esClient, stepType, stepWith);

      this.workflowLogger.logInfo(`Elasticsearch action completed: ${stepType}`, {
        event: { action: 'elasticsearch-action', outcome: 'success' },
        tags: ['elasticsearch', 'internal-action'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });

      return { input: stepWith, output: result, error: undefined };
    } catch (error) {
      const stepType = (this.step as any).configuration?.type || this.step.type;
      const stepWith = this.step.with || (this.step as any).configuration?.with;

      this.workflowLogger.logError(`Elasticsearch action failed: ${stepType}`, error as Error, {
        event: { action: 'elasticsearch-action', outcome: 'failure' },
        tags: ['elasticsearch', 'internal-action', 'error'],
        labels: {
          step_type: stepType,
          connector_type: stepType,
          action_type: 'elasticsearch',
        },
      });
      return await this.handleFailure(stepWith, error);
    }
  }

  private async executeElasticsearchRequest(
    esClient: any,
    stepType: string,
    params: any
  ): Promise<any> {
    // Support both raw API format and connector-driven syntax
    if (params.request) {
      // Raw API format: { request: { method, path, body } } - like Dev Console
      const { method = 'GET', path, body } = params.request;
      return await esClient.transport.request({
        method,
        path,
        body,
      });
    } else {
      // Use generated connector definitions to determine method and path (covers all 568+ ES APIs)
      const { method, path, body, params: queryParams } = this.buildRequestFromConnector(stepType, params);
      
      // Build query string manually if needed
      let finalPath = path;
      if (queryParams && Object.keys(queryParams).length > 0) {
        const queryString = new URLSearchParams(queryParams).toString();
        finalPath = `${path}?${queryString}`;
      }
      
      const requestOptions = {
        method,
        path: finalPath,
        body,
      };
      
      console.log('DEBUG - Sending to ES client:', JSON.stringify(requestOptions, null, 2));
      return await esClient.transport.request(requestOptions);
    }
  }

  private buildRequestFromConnector(
    stepType: string,
    params: any
  ): { method: string; path: string; body?: any; params?: any } {
    console.log('DEBUG - Input params:', JSON.stringify(params, null, 2));
    
    // Find the connector definition for this step type
    const connector = GENERATED_ELASTICSEARCH_CONNECTORS.find(c => c.type === stepType);
    
    if (connector && connector.patterns && connector.methods) {
      // Use explicit parameter type metadata (no hardcoded keys!)
      const urlParamKeys = new Set<string>(connector.parameterTypes?.urlParams || []);
      
      // Determine method (allow user override)
      const method = params.method || connector.methods[0]; // User can override method
      
      // Choose the best pattern based on available parameters
      let selectedPattern = this.selectBestPattern(connector.patterns, params);
      
      // Collect path parameters from the selected pattern
      const pathParams = new Set<string>();
      const pathParamMatches = selectedPattern.match(/\{([^}]+)\}/g);
      if (pathParamMatches) {
        for (const match of pathParamMatches) {
          pathParams.add(match.slice(1, -1)); // Remove { and }
        }
      }
      
      // Debug logging
      console.log('DEBUG - selectedPattern:', selectedPattern);
      console.log('DEBUG - pathParams:', Array.from(pathParams));
      console.log('DEBUG - urlParamKeys:', Array.from(urlParamKeys));
      
      // Replace path parameters in the selected pattern
      for (const [key, value] of Object.entries(params)) {
        if (pathParams.has(key)) {
          selectedPattern = selectedPattern.replace(`{${key}}`, encodeURIComponent(String(value)));
        }
      }
      
      // Build body and query parameters
      const body: any = {};
      const queryParams: any = {};
      
      for (const [key, value] of Object.entries(params)) {
        console.log(`DEBUG - Processing param: ${key}, isPathParam: ${pathParams.has(key)}, isUrlParam: ${urlParamKeys.has(key)}`);
        
        // Skip path parameters (they're used in the URL)
        if (pathParams.has(key)) continue;
        
        // Skip meta parameters that control request building
        if (key === 'method') continue;
        
        // URL parameters become query parameters
        if (urlParamKeys.has(key)) {
          // Convert arrays to comma-separated strings for query parameters
          const queryValue = Array.isArray(value) ? value.join(',') : value;
          queryParams[key] = queryValue;
          console.log(`DEBUG - Added to queryParams: ${key} = ${queryValue} (original: ${JSON.stringify(value)})`);
        } else if (key === 'body') {
          // Handle explicit body parameter
          if (typeof value === 'object' && value !== null) {
            Object.assign(body, value);
          }
        } else {
          // All other parameters go in the body (query, aggs, size, etc.)
          body[key] = value;
          console.log(`DEBUG - Added to body: ${key} = ${value}`);
        }
      }
      
      const result = {
        method,
        path: `/${selectedPattern}`,
        body: Object.keys(body).length > 0 ? body : undefined,
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      };
      
      console.log('DEBUG - Final request:', JSON.stringify(result, null, 2));
      return result;
    }
    
    // If no connector found, throw an error suggesting raw API format
    throw new Error(
      `No connector definition found for ${stepType}. Use raw API format with 'request' parameter: { request: { method: 'GET', path: '/my-index/_search', body: {...} } }`
    );
  }

  private selectBestPattern(patterns: string[], params: any): string {
    // Strategy: Prefer patterns where all path parameters are provided
    
    // Score each pattern based on how well it matches the provided parameters
    let bestPattern = patterns[0];
    let bestScore = -1;
    
    for (const pattern of patterns) {
      let score = 0;
      
      // Extract path parameters from this pattern
      const pathParamMatches = pattern.match(/\{([^}]+)\}/g);
      if (pathParamMatches) {
        const patternPathParams = pathParamMatches.map(match => match.slice(1, -1));
        
        // Count how many path parameters are satisfied
        let satisfiedParams = 0;
        for (const pathParam of patternPathParams) {
          if (params[pathParam] !== undefined) {
            satisfiedParams++;
          }
        }
        
        // Score = satisfied params / total params for this pattern
        // Higher score means better match
        score = satisfiedParams / patternPathParams.length;
        
        // If all path params are satisfied, this is a perfect match
        if (satisfiedParams === patternPathParams.length) {
          return pattern;
        }
      } else {
        // Pattern with no path parameters gets score 1 (always usable)
        score = 1;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestPattern = pattern;
      }
    }
    
    return bestPattern;
  }
}
