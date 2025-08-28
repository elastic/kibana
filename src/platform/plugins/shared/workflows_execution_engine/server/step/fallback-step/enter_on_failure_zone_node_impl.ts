/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterOnFailureZoneNode } from '@kbn/workflows';
import type { StepErrorCatcher, StepImplementation } from '../step_base';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';

export class EnterOnFailureZoneNodeImpl implements StepImplementation, StepErrorCatcher {
  constructor(
    private node: EnterOnFailureZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    this.wfExecutionRuntimeManager.enterScope();
    this.wfExecutionRuntimeManager.goToStep(this.node.enterNormalPathNodeId);
  }

  public catchError(): Promise<void> {
    this.workflowLogger.logError(
      'Error caught by the OnFailure zone. Redirecting to the fallback path'
    );
    this.wfExecutionRuntimeManager.setWorkflowError(undefined);
    this.wfExecutionRuntimeManager.goToStep(this.node.enterFallbackPathNodeId);
    return Promise.resolve();
  }
}
