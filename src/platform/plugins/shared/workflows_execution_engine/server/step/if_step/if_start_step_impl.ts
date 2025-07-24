/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { IfStep } from '@kbn/workflows';
import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { RunStepResult, StepImplementation } from '../step_base';

export class IfStartNodeImpl implements StepImplementation {
  constructor(private step: IfStep, private contextManager: WorkflowContextManager) {}

  public async run(): Promise<RunStepResult> {
    await this.contextManager.startStep((this.step as any).id);
    const ifNode = this.step as any; // typings will be fixed later
    const evaluatedConditionResult = ifNode.condition; // must be real condition from step definition

    let runningBranch: string[];
    let notRunningBranch: string[];

    if (evaluatedConditionResult) {
      runningBranch = ifNode.trueNodeIds;
      notRunningBranch = ifNode.falseNodeIds;
    } else {
      runningBranch = ifNode.falseNodeIds;
      notRunningBranch = ifNode.trueNodeIds;
    }

    await this.contextManager.skipSteps(notRunningBranch);
    this.contextManager.setCurrentStep(runningBranch[0]);
    return { output: undefined, error: undefined };
  }
}
