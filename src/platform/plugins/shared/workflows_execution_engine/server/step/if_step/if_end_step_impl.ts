/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowContextManager } from '../../workflow_context_manager/workflow_context_manager';
import { RunStepResult, StepImplementation } from '../step_base';

export class IfEndStepImpl implements StepImplementation {
  // It must be IfEndNode (or IfExitNode)
  constructor(private step: any, private contextManager: WorkflowContextManager) {}

  public async run(): Promise<RunStepResult> {
    await this.contextManager.finishStep((this.step as any).startNodeId);
    return { output: undefined, error: undefined };
  }
}
