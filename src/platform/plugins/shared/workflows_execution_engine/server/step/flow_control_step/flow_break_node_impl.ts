/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FlowBreakNode } from '@kbn/workflows/graph';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import { evaluateCondition } from '../evaluate_condition';
import type { NodeImplementation } from '../node_implementation';

export class FlowBreakNodeImpl implements NodeImplementation {
  constructor(
    private node: FlowBreakNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    if (this.node.condition) {
      const renderedCondition =
        this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(this.node.condition);
      const conditionResult = evaluateCondition(
        renderedCondition,
        this.stepExecutionRuntime.contextManager.getContext(),
        this.node.stepId
      );

      if (!conditionResult) {
        this.workflowLogger.logDebug(
          `flow.break condition "${this.node.condition}" evaluated to false for step "${this.node.stepId}". Continuing loop.`,
          { workflow: { step_id: this.node.stepId } }
        );
        this.wfExecutionRuntimeManager.navigateToNextNode();
        return;
      }
    }

    this.workflowLogger.logDebug(
      `flow.break triggered in step "${this.node.stepId}". Exiting enclosing loop.`,
      { workflow: { step_id: this.node.stepId } }
    );

    this.wfExecutionRuntimeManager.requestLoopBreak(this.node.loopStepId);
    this.wfExecutionRuntimeManager.navigateToNode(this.node.loopExitNodeId);
  }
}
