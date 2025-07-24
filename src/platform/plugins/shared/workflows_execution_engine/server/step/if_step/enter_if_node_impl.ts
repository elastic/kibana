/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EnterIfNode } from '@kbn/workflows';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { StepImplementation } from '../step_base';

export class EnterIfNodeImpl implements StepImplementation {
  constructor(private step: EnterIfNode, private contextManager: WorkflowContextManager) {}

  public async run(): Promise<void> {
    await this.contextManager.startStep(this.step.id);
    const evaluatedConditionResult = this.step.configuration.condition; // must be real condition from step definition

    let runningBranch: string[];
    let notRunningBranch: string[];

    if (evaluatedConditionResult) {
      runningBranch = this.step.trueNodeIds;
      notRunningBranch = this.step.falseNodeIds;
    } else {
      runningBranch = this.step.falseNodeIds;
      notRunningBranch = this.step.trueNodeIds;
    }

    await this.contextManager.skipSteps(notRunningBranch);
    this.contextManager.setCurrentStep(runningBranch[0]);
  }
}
