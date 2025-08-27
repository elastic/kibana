/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterContinueNode } from '@kbn/workflows';
import type { StepErrorCatcher, StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class EnterContinueNodeImpl implements StepImplementation, StepErrorCatcher {
  constructor(
    private node: EnterContinueNode,
    private workflowRuntime: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.workflowRuntime.enterScope();
    this.workflowRuntime.goToNextStep();
  }

  public async catchError(): Promise<void> {
    this.workflowLogger.logDebug(`Error caught, continuing execution.`);

    // Continue step should always go to exit continue node to continue execution
    // regardless of any errors that occurred within its scope
    this.workflowRuntime.goToStep(this.node.exitNodeId);
    this.workflowRuntime.setWorkflowError(undefined);
  }
}
