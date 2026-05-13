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
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IStepExecutionRuntimeFactory } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionState } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowEventLogger } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class LoopContinueNodeImpl implements INodeImplementation {
  constructor(
    private node: LoopContinueNode,
    private stepExecutionRuntime: IStepExecutionRuntime,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private stepExecutionRuntimeFactory: IStepExecutionRuntimeFactory,
    private workflowExecutionState: IWorkflowExecutionState,
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
    this.workflowExecutionState.evictStaleLoopOutputs(innerStepIds);
    this.workflowLogger.logDebug(
      `Evicted stale in-memory outputs for ${innerStepIds.size} inner step(s) of loop "${loopStepId}" after continue`,
      { workflow: { step_id: this.node.stepId } }
    );
    this.wfExecutionRuntimeManager.navigateToNode(this.node.loopExitNodeId);
  }
}
