/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterNormalPathNode } from '@kbn/workflows';
import type { StepErrorCatcher, StepImplementation } from '../../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../../workflow_event_logger/workflow_event_logger';

export class EnterNormalPathNodeImpl implements StepImplementation, StepErrorCatcher {
  constructor(
    private node: EnterNormalPathNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.enterScope();
    this.wfExecutionRuntimeManager.goToNextStep();
  }

  public async catchError(): Promise<void> {
    this.workflowLogger.logError(
      'Error caught by the OnFailure zone. Redirecting to the fallback path'
    );
    const stepState = this.wfExecutionRuntimeManager.getStepState(this.node.enterZoneNodeId) || {};

    await this.wfExecutionRuntimeManager.setStepState(this.node.enterZoneNodeId, {
      ...stepState,
      error: this.wfExecutionRuntimeManager.getWorkflowExecution().error, // save error to the state of the enter node
    });
    this.wfExecutionRuntimeManager.setWorkflowError(undefined); // clear workflow error to let run go
    this.wfExecutionRuntimeManager.goToStep(this.node.enterFailurePathNodeId);
    return Promise.resolve();
  }
}
