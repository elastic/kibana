/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { EsApiRequestStep } from '@kbn/workflows';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { StepBase, RunStepResult } from './step_base';
import { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';

export interface EsApiStepConfig extends EsApiRequestStep {
  type: 'elasticsearch.request';
  // Accept PoC YAML shape that uses `with` instead of `request`
  with?: {
    method?: string;
    path?: string;
    query?: Record<string, any>;
    headers?: Record<string, string>;
    body?: any;
  };
}

export class EsApiStepImpl extends StepBase<EsApiStepConfig> {
  constructor(
    step: EsApiStepConfig,
    private esClientAsUser: ElasticsearchClient,
    contextManager: WorkflowContextManager,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger?: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowExecutionRuntime);
  }

  protected async _run(): Promise<RunStepResult> {
    // Evaluate optional 'if' condition
    const shouldRun = await this.evaluateCondition(this.step.if);
    if (!shouldRun) {
      return { output: undefined, error: undefined };
    }

    const ctx = this.contextManager.getContext();

    // Render request pieces (allow templating in strings)
    const render = (v: any) => (typeof v === 'string' ? this.templatingEngine.render(v, ctx) : v);

    // Normalize request block: prefer explicit `request`, fallback to PoC `with`
    // If both are present, merge them with `request` taking precedence.
    const requestBlock = (this.step as any).request ?? {};
    const withBlock = (this.step as any).with ?? {};
    const req: any = { ...(withBlock || {}), ...(requestBlock || {}) };

    // Normalize and validate method/path (render strings, coerce non-strings)
    const methodRaw = req.method;
    let method: string | undefined;
    if (typeof methodRaw === 'string') {
      method = render(methodRaw);
    } else if (methodRaw != null) {
      method = String(methodRaw);
    }

    const pathRaw = req.path;
    let path: string | undefined;
    if (typeof pathRaw === 'string') {
      path = render(pathRaw);
    } else if (pathRaw != null) {
      path = String(pathRaw);
    }

    // Default to GET when method is omitted but path provided (developer-friendly PoC behavior)
    if (!method && path) {
      method = 'GET';
    }
    // Uppercase method for ES transport
    if (method) method = method.toUpperCase();

    if (!method || typeof method !== 'string') {
      return { output: undefined, error: "Elasticsearch API step requires 'with.method' (string)" };
    }
    if (!path || typeof path !== 'string') {
      return { output: undefined, error: "Elasticsearch API step requires 'with.path' (string)" };
    }

    const query = Object.fromEntries(
      Object.entries(req.query ?? {}).map(([k, v]) => [k, render(v)])
    );
    const headers = Object.fromEntries(
      Object.entries(req.headers ?? {}).map(([k, v]) => [k, render(v as any)])
    );
    const body = render(req.body);

    const timingEvent = {
      message: `Elasticsearch request ${method} ${path}`,
      event: { action: 'es-request', category: ['workflow'], type: ['request'] },
      tags: ['elasticsearch', 'request'],
    };

    try {
      this.workflowLogger?.startTiming(timingEvent);
      this.workflowLogger?.logDebug('Executing Elasticsearch request', {
        event: { action: 'es-request' },
        request: { method, path, query, headers: Object.keys(headers) },
      });

      const resp = await this.esClientAsUser.transport.request(
        {
          method: method as any,
          path,
          querystring: query as any,
          body,
        },
        { headers }
      );

      this.workflowLogger?.logDebug('Elasticsearch request completed', {
        event: { action: 'es-response', outcome: 'success' },
        response: { statusCode: (resp as any)?.statusCode },
      });
      this.workflowLogger?.stopTiming({
        ...timingEvent,
        event: { ...timingEvent.event, outcome: 'success' },
      });

      return {
        output: {
          statusCode: (resp as any)?.statusCode ?? undefined,
          body: resp,
        },
        error: undefined,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.workflowLogger?.logError('Elasticsearch request failed', err as any, {
        event: { action: 'es-response', outcome: 'failure' },
        error: { message: errorMessage },
      });
      this.workflowLogger?.stopTiming({
        ...timingEvent,
        event: { ...timingEvent.event, outcome: 'failure' },
      });

      return {
        output: undefined,
        error: errorMessage,
      };
    }
  }
}
