/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoopBreakNode, WorkflowGraph } from '@kbn/workflows/graph';
import { isLoopEnterScope } from './is_loop_enter_scope';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IStepExecutionRuntimeFactory } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionState } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowEventLogger } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class LoopBreakNodeImpl implements INodeImplementation {
  constructor(
    private node: LoopBreakNode,
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
      `loop.break triggered in step "${this.node.stepId}". Exiting enclosing loop.`,
      { workflow: { step_id: this.node.stepId } }
    );

    this.stepExecutionRuntime.finishStep({ navigateToNode: this.node.loopExitNodeId });

    this.wfExecutionRuntimeManager.unwindScopes(
      this.stepExecutionRuntimeFactory,
      isLoopEnterScope,
      { inclusive: true }
    );
    const innerStepIds = this.workflowGraph.getInnerStepIds(this.node.loopStepId);
    this.workflowExecutionState.evictStaleLoopOutputs(innerStepIds);
    this.workflowLogger.logDebug(
      `Evicted stale in-memory outputs for ${innerStepIds.size} inner step(s) of loop "${this.node.loopStepId}" after break`,
      { workflow: { step_id: this.node.stepId } }
    );
    this.wfExecutionRuntimeManager.navigateToAfterNode(this.node.loopExitNodeId);
  }
}
