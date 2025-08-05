/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterForeachNode } from '@kbn/workflows';
import { StepImplementation } from '../step_base';
import { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';

export class EnterForeachNodeImpl implements StepImplementation {
  constructor(
    private step: EnterForeachNode,
    private workflowState: WorkflowExecutionRuntimeManager
  ) {}

  public async run(): Promise<void> {
    const evaluatedItems = this.step.configuration.foreach; // must be real items from step definition
    const foreachState = this.workflowState.getStepState(this.step.id);

    if (!foreachState) {
      await this.workflowState.startStep(this.step.id);
      // Initialize foreach state
      void this.workflowState.setStepState(this.step.id, {
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
      void this.workflowState.setStepState(this.step.id, {
        items,
        index,
        item,
        total,
      });
    }

    void this.workflowState.goToNextStep();
  }
}
