/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExitForeachNode } from '@kbn/workflows';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { StepImplementation } from '../step_base';

export class ExitForeachNodeImpl implements StepImplementation {
  constructor(private step: ExitForeachNode, private contextManager: WorkflowContextManager) {}

  public async run(): Promise<void> {
    const foreachState = this.contextManager.getNodeState(this.step.startNodeId);

    if (foreachState.items[foreachState.index + 1]) {
      this.contextManager.setCurrentStep(this.step.startNodeId);
      return;
    }

    await this.contextManager.setNodeState(this.step.startNodeId, undefined);
    await this.contextManager.finishStep(this.step.startNodeId);
  }
}
