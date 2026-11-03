/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LoopBreakNode } from '@kbn/workflows/graph';
import { isLoopEnterScope } from './is_loop_enter_scope';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';
import type { StepExecutionRuntimeFactory } from '../../workflow_context_manager/step_execution_runtime_factory';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger';
import type { NodeImplementation } from '../node_implementation';

export class LoopBreakNodeImpl implements NodeImplementation {
  constructor(
    private node: LoopBreakNode,
    private stepExecutionRuntime: StepExecutionRuntime,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger,
    private stepExecutionRuntimeFactory: StepExecutionRuntimeFactory
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
    this.wfExecutionRuntimeManager.navigateToAfterNode(this.node.loopExitNodeId);
  }
}
