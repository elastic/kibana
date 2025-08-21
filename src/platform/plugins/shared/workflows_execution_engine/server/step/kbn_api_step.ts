/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v 3.0 only", or the "Server Side Public License, v 1".
 */

import { KbnApiRequestStep } from '@kbn/workflows';
import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { WorkflowExecutionRuntimeManager } from '../workflow_context_manager/workflow_execution_runtime_manager';
import { StepBase, RunStepResult } from './step_base';
import { IWorkflowEventLogger } from '../workflow_event_logger/workflow_event_logger';
import type { KibanaServiceAdapters } from '../service_adapters/types';

export interface KbnApiStepConfig extends KbnApiRequestStep {
  type: 'kibana.request';
  with?: { api?: 'cases.create' | 'cases.addComment' } & Record<string, any>;
}

export class KbnApiStepImpl extends StepBase<KbnApiStepConfig> {
  constructor(
    step: KbnApiStepConfig,
    private services: KibanaServiceAdapters,
    contextManager: WorkflowContextManager,
    workflowExecutionRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger?: IWorkflowEventLogger
  ) {
    super(step, contextManager, undefined, workflowExecutionRuntime);
  }

  protected async _run(): Promise<RunStepResult> {
    const shouldRun = await this.evaluateCondition(this.step.if);
    if (!shouldRun) {
      return { output: undefined, error: undefined };
    }

    const ctx = this.contextManager.getContext();
    const render = (v: any) => (typeof v === 'string' ? this.templatingEngine.render(v, ctx) : v);

    const api = this.step.with?.api;
    if (!api) {
      // Manual-only PoC: do nothing but log
      this.workflowLogger?.logInfo('kibana.request is manual-only in this PoC');
      return { output: undefined, error: undefined };
    }

    try {
      switch (api) {
        case 'cases.create': {
          if (!this.services.cases) throw new Error('Cases service unavailable');
          const params = { ...(this.step.with || {}) };
          delete (params as any).api;
          const rendered = Object.fromEntries(
            Object.entries(params).map(([k, v]) => [k, render(v)])
          );
          this.workflowLogger?.logDebug('Creating case via adapter', {
            event: { action: api },
          });
          const resp = await this.services.cases.createCase(rendered);
          return { output: resp, error: undefined };
        }
        case 'cases.addComment': {
          if (!this.services.cases) throw new Error('Cases service unavailable');
          const { caseId, ...rest } = (this.step.with || {}) as any;
          if (!caseId) throw new Error('with.caseId is required');
          const renderedCaseId = render(caseId);
          const rendered = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, render(v)]));
          this.workflowLogger?.logDebug('Adding case comment via adapter', {
            event: { action: api },
          });
          const resp = await this.services.cases.addComment(renderedCaseId, rendered);
          return { output: resp, error: undefined };
        }
        default:
          throw new Error(`Unsupported api: ${api}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.workflowLogger?.logError('Kibana request failed', err as any, {
        event: { action: 'kbn-response', outcome: 'failure' },
        error: { message: errorMessage },
      });
      return { output: undefined, error: errorMessage };
    }
  }
}
