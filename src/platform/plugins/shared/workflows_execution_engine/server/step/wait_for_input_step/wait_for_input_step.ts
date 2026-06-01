/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WaitForInputGraphNode } from '@kbn/workflows/graph';
import {
  HITL_EVENT_TYPES,
  type HitlAnalytics,
  type HitlLogger,
  reportHitlEvent,
} from '@kbn/workflows-hitl-telemetry';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class WaitForInputStepImpl implements NodeImplementation {
  constructor(
    private node: WaitForInputGraphNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private analytics?: HitlAnalytics
  ) {}

  async run(): Promise<void> {
    // The step runtime's abort signal is how monitors (workflow-level timeout,
    // cancellation) tell a step "you have already been settled — do not touch
    // state". Without this guard a waitForInput that is resumed after the
    // workflow has timed out would enter `tryEnterWaitUntil` with an in-memory
    // status of FAILED (set by the monitor's failStep call), treat itself as
    // "not already waiting", and re-write status back to WAITING_FOR_INPUT —
    // leaving a zombie step that `listWaitingForInputSteps` keeps surfacing in
    // the Inbox forever.
    if (this.stepExecutionRuntime.abortController.signal.aborted) {
      this.workflowLogger.logDebug(
        `Step '${this.node.stepId}' run aborted before wait-entry; skipping`,
        { event: { action: 'hitl:aborted' } }
      );
      const { id: executionId, workflowId } = this.workflowRuntime.getWorkflowExecution();
      reportHitlEvent(this.analytics, this.makeHitlLogger(), HITL_EVENT_TYPES.timedOut, {
        execution_id: executionId,
        source_app: 'workflows',
        step_execution_id: this.stepExecutionRuntime.stepExecutionId,
        responseSource: 'unknown',
        workflow_id: workflowId,
      });
      return;
    }

    if (this.stepExecutionRuntime.tryEnterWaitUntil(undefined, ExecutionStatus.WAITING_FOR_INPUT)) {
      // Store step config as input so the record is self-contained
      // consistent with every other step type & readable without a definition lookup
      const withConfig = this.node.configuration?.with;
      if (withConfig) {
        const ctx = this.stepExecutionRuntime.contextManager;
        this.stepExecutionRuntime.setInput({
          ...(withConfig.message !== undefined && {
            message: ctx.renderValueAccordingToContext(withConfig.message),
          }),
          ...(withConfig.schema !== undefined && { schema: withConfig.schema }),
        });
      }
      this.workflowLogger.logDebug(`Step '${this.node.stepId}' is waiting for human input`, {
        event: { action: 'hitl:waiting' },
      });
      const { id: executionId, workflowId } = this.workflowRuntime.getWorkflowExecution();
      this.workflowLogger.logDebug(
        `[hitl-debug][wf] waitForInput.enter exec=${executionId} seq=(none) stepId=${
          this.stepExecutionRuntime.stepExecutionId
        } workflowId=${workflowId} schemaPresent=${
          withConfig?.schema !== undefined
        } messagePresent=${withConfig?.message !== undefined}`,
        { event: { action: 'hitl:stage2:enter' } }
      );
      reportHitlEvent(this.analytics, this.makeHitlLogger(), HITL_EVENT_TYPES.created, {
        execution_id: executionId,
        source_app: 'workflows',
        step_execution_id: this.stepExecutionRuntime.stepExecutionId,
        responseSource: 'unknown',
        workflow_id: workflowId,
      });
      return;
    }

    this.workflowLogger.logDebug(`Step '${this.node.stepId}' resuming with human input`, {
      event: { action: 'hitl:resuming' },
    });
    this.resume();
  }

  private resume(): void {
    const execution = this.workflowRuntime.getWorkflowExecution();
    const context = execution.context;
    const resumeInput = context?.resumeInput as Record<string, unknown> | undefined;
    const ctx = context as Record<string, unknown> | null | undefined;
    const resumedBy = typeof ctx?.resumedBy === 'string' ? ctx.resumedBy : 'unknown';
    const executionId = execution.id;

    this.stepExecutionRuntime.finishStep(resumeInput);

    // Clear resumeInput so subsequent waitForInput steps are not auto-completed.
    if (context != null && typeof context === 'object' && 'resumeInput' in context) {
      const { resumeInput: _cleared, ...restContext } = context as Record<string, unknown>;
      this.stepExecutionRuntime.updateWorkflowExecution({ context: restContext });
    }

    this.workflowLogger.logDebug(`Workflow ${executionId} resumed by ${resumedBy}`, {
      event: {
        action: 'hitl:resumed',
        category: ['workflow'],
        outcome: 'success',
        provider: 'workflow-engine',
      },
      labels: {
        responder: resumedBy,
        execution_id: executionId,
      },
    });
    this.workflowLogger.logDebug(
      `[hitl-debug][wf] waitForInput.resume exec=${executionId} seq=(none) stepId=${this.stepExecutionRuntime.stepExecutionId} resumedBy=${resumedBy}`,
      { event: { action: 'hitl:stage2:resume' } }
    );

    this.workflowRuntime.navigateToNextNode();
  }

  /** Adapts IWorkflowEventLogger to the HitlLogger interface expected by reportHitlEvent. */
  private makeHitlLogger(): HitlLogger {
    const logger = this.workflowLogger;
    return {
      debug: (msg, meta) => {
        const resolved = typeof msg === 'function' ? msg() : msg;
        logger.logDebug(resolved, meta);
      },
    };
  }
}
