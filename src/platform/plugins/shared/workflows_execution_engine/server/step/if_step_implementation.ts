/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowContextManager } from '../workflow_context_manager/workflow_context_manager';
import { RunStepResult, StepBase, BaseStep } from './step_base';

// Extend BaseStep for connector-specific properties
export interface ConnectorStep extends BaseStep {
  'connector-id'?: string;
  with?: Record<string, any>;
}

export class IfStepImpl extends StepBase<ConnectorStep> {
  constructor(
    step: ConnectorStep,
    contextManager: WorkflowContextManager,
    templatingEngineType: 'mustache' | 'nunjucks' = 'nunjucks',
    private role?: 'start' | 'end'
  ) {
    super(step, contextManager, undefined, templatingEngineType);
  }

  public async _run(): Promise<RunStepResult> {
    if (this.role === 'start') {
      await this.handleIfStart();
    }
    if (this.role === 'end') {
      await this.handleIfEnd();
    }

    return { output: undefined, error: undefined };
  }

  private async handleIfStart(): Promise<void> {
    const ifNode = this.step as any;
    const evaluatedConditionResult = ifNode.condition;
    const stepIdsToSkip = evaluatedConditionResult ? ifNode.falseNodeIds : ifNode.trueNodeIds;

    await this.contextManager.skipSteps(stepIdsToSkip);
  }

  private async handleIfEnd(): Promise<void> {
    // Handle the end of an 'if' step
    // This could involve cleaning up context, logging, etc.
  }
}
