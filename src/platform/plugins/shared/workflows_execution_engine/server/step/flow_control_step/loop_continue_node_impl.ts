/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoopContinueNode, WorkflowGraph } from '@kbn/workflows/graph';
import { isLoopEnterScope } from './is_loop_enter_scope';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { StepIoService } from '../../workflow_context_manager/step_io_service';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class LoopContinueNodeImpl implements NodeImplementation {
  constructor(
    private node: LoopContinueNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory,
    private stepIoService: StepIoService,
    private workflowGraph: WorkflowGraph
  ) {}

  public run(): void {
    this.stepExecutionRuntime.startStep();

    this.workflowLogger.logDebug(
      `loop.continue triggered in step "${this.node.stepId}". Skipping to next iteration.`,
      { workflow: { step_id: this.node.stepId } }
    );

    this.stepExecutionRuntime.finishStep({ navigateToNode: this.node.loopExitNodeId });

    this.wfExecutionRuntimeManager.unwindScopes(this.stepExecutionRuntimeFactory, isLoopEnterScope);
    // Evict stale outputs from the current iteration before looping back.
    // Without this, a 1000-iteration loop accumulates all stale outputs
    // in memory until the loop fully exits.
    const loopStepId = this.workflowGraph.getNode(this.node.loopExitNodeId).stepId;
    const innerStepIds = this.workflowGraph.getInnerStepIds(loopStepId);
    this.stepIoService.evictStaleLoopOutputs(innerStepIds);
    this.workflowLogger.logDebug(
      `Evicted stale in-memory outputs for ${innerStepIds.size} inner step(s) of loop "${loopStepId}" after continue`,
      { workflow: { step_id: this.node.stepId } }
    );
    this.wfExecutionRuntimeManager.navigateToNode(this.node.loopExitNodeId);
  }
}
