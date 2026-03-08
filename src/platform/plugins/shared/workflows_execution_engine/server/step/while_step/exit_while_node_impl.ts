/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitWhileNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { evaluateCondition } from '../evaluate_condition';
import type { NodeImplementation } from '../node_implementation';

export class ExitWhileNodeImpl implements NodeImplementation {
  constructor(
    private node: ExitWhileNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    const whileState = this.stepExecutionRuntime.getCurrentStepState();

    if (!whileState) {
      throw new Error(`While state for step ${this.node.stepId} not found`);
    }

    const nextIteration = whileState.iteration + 1;
    const maxReached =
      this.node.maxIterations !== undefined && nextIteration >= this.node.maxIterations;

    if (!maxReached) {
      // The while scope has already been popped from the execution scope stack by
      // run_node.ts exitScope() before this node runs, so getContext() won't include
      // the while context. Inject it explicitly from the step state.
      const whileAdditionalContext: Record<string, unknown> = {
        while: { iteration: nextIteration },
      };

      const renderedCondition =
        this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(
          this.node.condition,
          whileAdditionalContext
        );
      const conditionResult = evaluateCondition(
        renderedCondition,
        { ...this.stepExecutionRuntime.contextManager.getContext(), ...whileAdditionalContext },
        this.node.stepId
      );
      if (conditionResult) {
        this.wfExecutionRuntimeManager.navigateToNode(this.node.startNodeId);
        return;
      }
    }

    if (maxReached && this.node.onLimit === 'fail') {
      throw new Error(
        `While step "${this.node.stepId}" exceeded max-iterations limit of ${this.node.maxIterations}. ` +
          `Completed ${nextIteration} iterations.`
      );
    }

    this.stepExecutionRuntime.finishStep();

    const reason = maxReached
      ? `reached max-iterations limit of ${this.node.maxIterations}`
      : 'condition evaluated to false';
    this.workflowLogger.logDebug(
      `Exiting while step "${this.node.stepId}" after ${reason}. ` +
        `Completed ${nextIteration} iterations.`,
      { workflow: { step_id: this.node.stepId } }
    );
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
