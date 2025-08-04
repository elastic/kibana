/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterIfNode, EnterConditionBranchNode } from '@kbn/workflows';
import { StepImplementation } from '../step_base';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

export class EnterIfNodeImpl implements StepImplementation {
  constructor(private step: EnterIfNode, private workflowState: WorkflowExecutionRuntimeManager) {}

  public async run(): Promise<void> {
    await this.workflowState.startStep(this.step.id);
    const successors: any[] = this.workflowState.getNodeSuccessors(this.step.id);

    const thenNode = successors?.find((node) =>
      Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode;
    // multiple else-if could be implemented similarly to thenNode
    const elseNode = successors?.find(
      (node) => !Object.hasOwn(node, 'condition')
    ) as EnterConditionBranchNode;

    const evaluatedConditionResult =
      typeof thenNode.condition === 'boolean'
        ? thenNode.condition
        : thenNode.condition?.toLowerCase() === 'true'; // must be real condition from step definition)

    if (evaluatedConditionResult) {
      this.workflowState.goToStep(thenNode.id);
    } else if (elseNode) {
      this.workflowState.goToStep(elseNode.id);
    } else {
      // in the case when the condition evaluates to false and no else branch is defined
      // we go straight to the exit node skipping "then" branch
      this.workflowState.goToStep(this.step.exitNodeId);
    }
  }
}
