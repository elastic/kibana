/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitConditionBranchNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class ExitConditionBranchNodeImpl implements NodeImplementation {
  constructor(
    private step: ExitConditionBranchNode,
    private workflowGraph: WorkflowGraph,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    const successors = this.workflowGraph.getDirectSuccessors(this.step.id);

    if (successors.length !== 1) {
      throw new Error(
        `ExitConditionBranchNode with id ${this.step.id} must have exactly one successor, but found ${successors.length}.`
      );
    }

    if (successors[0].type !== 'exit-if') {
      throw new Error(
        `ExitConditionBranchNode with id ${this.step.id} must have an exit-if successor, but found ${successors[0].type} with id ${successors[0].id}.`
      );
    }

    // After the branch finishes, we go to the end of If condition
    const exitIfNode = successors[0];
    this.wfExecutionRuntimeManager.navigateToNode(exitIfNode.id);
  }
}
