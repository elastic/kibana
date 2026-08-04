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

import { buildKibanaRequest, KibanaHttpMethods } from '@kbn/workflows';
import {
  CallKibanaApiResponseTooLargeError,
  type BufferedRawBody,
} from '../lib/call_kibana_api';
import type { KibanaGraphNode } from '@kbn/workflows/graph/types';
import { ResponseSizeLimitError } from './errors';
import type { BaseStep, RunStepResult } from './node_implementation';
import { BaseAtomicNodeImplementation } from './node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../workflow_event_logger';

/**
 * Describes a single field in a multipart/form-data upload.
 * Used by the `form_data` param of `kibana.request` steps.
 */
interface FormDataFieldSpec {
  /** The field value / file content (string). */
  content: string;
  /** Optional filename hint (e.g. "export.ndjson"). */
  filename?: string;
  /** MIME type of the field value (e.g. "application/ndjson"). */
  content_type?: string;
}

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
    const { debug = false, ...httpParams } = stepWith;

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

      const result = await this.executeKibanaRequest(stepType, httpParams, debug);

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
        failure.error = {
          type: failure.error.type,
          message: failure.error.message,
          details: { ...failure.error.details, _debug: { selfClient: true } },
        };
      }
      return failure;
    }
  }

  private async executeKibanaRequest(
    stepType: string,
    params: any,
    debug: boolean = false
  ): Promise<any> {
    const spaceId = this.stepExecutionRuntime.contextManager.getWorkflowSpaceId();
    const { fetcher: _fetcherOptions, ...cleanParams } = params;
    let requestConfig: {
      method: string;
      path: string;
      body?: unknown;
      rawBody?: BufferedRawBody;
      query?: Record<string, string | number | boolean | undefined>;
      headers?: Record<string, string>;
    };

    if (cleanParams.body && cleanParams.form_data) {
      throw new Error('Cannot set both body and form_data — they are mutually exclusive.');
    }
    if (cleanParams.request) {
      const { method = 'GET', path, body, query, headers } = cleanParams.request;
      requestConfig = { method, path, body, query, headers };
    } else if (cleanParams.form_data) {
      const { form_data, method = 'POST', path, query, headers } = cleanParams;
      requestConfig = { method, path, query, headers, rawBody: this.buildFormData(form_data) };
    } else {
      const { method, path, body, query, headers } = buildKibanaRequest(stepType, cleanParams, spaceId);
      requestConfig = { method, path, body, query, headers };
    }

    const normalizedMethod = requestConfig.method?.toUpperCase();
    if (!normalizedMethod || !(KibanaHttpMethods as readonly string[]).includes(normalizedMethod)) {
      throw new Error(`Invalid HTTP method "${requestConfig.method}". Valid values: ${KibanaHttpMethods.join(', ')}`);
    }

    const contextManager = this.stepExecutionRuntime.contextManager;
    let result: { body: any };
    try {
      result = await contextManager.callKibanaApi({
        method: normalizedMethod as 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
        path: requestConfig.path,
        body: requestConfig.rawBody === undefined ? requestConfig.body : undefined,
        rawBody: requestConfig.rawBody,
        query: requestConfig.query,
        headers: requestConfig.headers,
        maxResponseBytes: this.getMaxResponseBytes(),
      });
    } catch (error) {
      if (error instanceof CallKibanaApiResponseTooLargeError) {
        throw new ResponseSizeLimitError(error.limitBytes, this.step.name);
      }
      throw error;
    }

    if (debug && result.body && typeof result.body === 'object' && !Buffer.isBuffer(result.body) && !Array.isArray(result.body)) {
      return { ...result.body, _debug: { method: normalizedMethod } };
    }
    return result.body;
  }

  private buildFormData(formData: Record<string, FormDataFieldSpec>): FormData {
    const fd = new FormData();
    for (const [fieldName, spec] of Object.entries(formData)) {
      if (spec.filename !== undefined) {
        fd.append(fieldName, new Blob([spec.content], { type: spec.content_type ?? 'application/octet-stream' }), spec.filename);
      } else if (spec.content_type !== undefined) {
        fd.append(fieldName, new Blob([spec.content], { type: spec.content_type }));
      } else {
        fd.append(fieldName, spec.content);
      }
    }
    return fd;
  }


}
