/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitConditionBranchNode } from '@kbn/workflows';
import { StepImplementation } from '../step_base';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

export class ExitConditionBranchNodeImpl implements StepImplementation {
  constructor(
    private step: ExitConditionBranchNode,
    private workflowState: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const successors = this.workflowState.getNodeSuccessors(this.step.startNodeId);

    if (successors.length !== 1) {
      throw new Error(
        `ExitConditionBranchNode with id ${this.step.id} must have exactly one successor, but found ${successors.length}.`
      );
    }

    // After the branch finishes, we go to the end of If condition
    const exitIfNode = successors[0];
    this.workflowState.goToStep(exitIfNode.id);
  }
}
