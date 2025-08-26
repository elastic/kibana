/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExitConditionBranchNode } from '@kbn/workflows';
import type { StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

export class ExitConditionBranchNodeImpl implements StepImplementation {
  constructor(
    private step: ExitConditionBranchNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const successors = this.wfExecutionRuntimeManager.getNodeSuccessors(this.step.id);

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
    this.wfExecutionRuntimeManager.goToStep(exitIfNode.id);
  }
}
