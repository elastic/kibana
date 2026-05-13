/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterWhileNode } from '@kbn/workflows/graph';
import type { WhileStepState } from './types';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowEventLogger } from '@kbn/workflows-execution-engine-core';
import type { INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class EnterWhileNodeImpl implements INodeImplementation {
  constructor(
    private node: EnterWhileNode,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: IStepExecutionRuntime,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public run(): void {
    if (!this.stepExecutionRuntime.getCurrentStepState()) {
      this.enterWhile();
    } else {
      this.advanceIteration();
    }
  }

  private enterWhile(): void {
    this.stepExecutionRuntime.startStep();
    this.stepExecutionRuntime.setInput({
      condition: this.node.configuration.condition,
    });

    this.workflowLogger.logDebug(`While step "${this.node.stepId}" starting first iteration.`, {
      workflow: { step_id: this.node.stepId },
    });
    const whileState: WhileStepState = { iteration: 0 };
    this.stepExecutionRuntime.setCurrentStepState(whileState);
    this.wfExecutionRuntimeManager.enterScope('0');
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  private advanceIteration(): void {
    const whileState = this.stepExecutionRuntime.getCurrentStepState() as
      | WhileStepState
      | undefined;

    if (!whileState) {
      throw new Error(`While state for step ${this.node.stepId} not found`);
    }

    const iteration = whileState.iteration + 1;

    this.stepExecutionRuntime.setCurrentStepState({ iteration });
    this.wfExecutionRuntimeManager.enterScope(iteration.toString());
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }
}
