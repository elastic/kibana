/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterForeachNode } from '@kbn/workflows';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { StepImplementation } from '../step_base';
import { WorkflowState } from '../../workflow_context_manager/workflow_state';

export class EnterForeachNodeImpl implements StepImplementation {
  constructor(
    private step: EnterForeachNode,
    private contextManager: WorkflowContextManager, // TODO: Will be used later for items evaluation
    private workflowState: WorkflowState
  ) {}

  public async run(): Promise<void> {
    const evaluatedItems = this.step.configuration.foreach; // must be real items from step definition
    const foreachState = this.workflowState.getStepState(this.step.id);

    if (!foreachState) {
      await this.workflowState.startStep(this.step.id);
      // Initialize foreach state
      this.workflowState.setStepState(this.step.id, {
        items: evaluatedItems,
        item: evaluatedItems[0],
        index: 0,
        total: evaluatedItems.length,
      });
    } else {
      // Update items and index if they have changed
      const items = foreachState.items;
      const index = foreachState.index + 1;
      const item = evaluatedItems[index];
      const total = foreachState.total;
      this.workflowState.setStepState(this.step.id, {
        items,
        index,
        item,
        total,
      });
    }

    this.workflowState.goToNextStep();
  }
}
