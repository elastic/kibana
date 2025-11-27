/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitSwitchCaseNode, WorkflowGraph } from '@kbn/workflows/graph';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { NodeImplementation } from '../node_implementation';

export class ExitSwitchCaseNodeImpl implements NodeImplementation {
  constructor(
    private node: ExitSwitchCaseNode,
    private workflowGraph: WorkflowGraph,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public run(): void {
    this.wfExecutionRuntimeManager.exitScope();
    // Find the exit-switch node by looking for successors
    const successors = this.workflowGraph.getDirectSuccessors(this.node.id);
    const exitSwitchNode = successors.find((node) => node.type === 'exit-switch');
    if (exitSwitchNode) {
      this.wfExecutionRuntimeManager.navigateToNode(exitSwitchNode.id);
    } else {
      throw new Error(
        `ExitSwitchCaseNode ${this.node.id} must have an exit-switch successor, but none found.`
      );
    }
  }
}
