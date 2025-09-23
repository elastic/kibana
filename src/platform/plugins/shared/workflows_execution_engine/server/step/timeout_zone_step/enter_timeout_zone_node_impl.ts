/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import type { NodeImplementation } from '../node_implementation';
import type { WorkflowExecutionRuntimeManager } from '../../workflow_context_manager/workflow_execution_runtime_manager';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import type { WorkflowScopeStack } from '../../workflow_context_manager/workflow_scope_stack';
import type { WorkflowExecutionState } from '../../workflow_context_manager/workflow_execution_state';

import { buildStepExecutionId, parseDuration } from '../../utils';

export class EnterTimeoutZoneNodeImpl implements NodeImplementation {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private wfExecutionState: WorkflowExecutionState,
    private workflowLogger: IWorkflowEventLogger
  ) {}

  public async run(): Promise<void> {
    await this.wfExecutionRuntimeManager.startStep();
    this.wfExecutionRuntimeManager.enterScope();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public async ping(stack: WorkflowScopeStack): Promise<void> {
    const timeoutMs = parseDuration(this.node.timeout);
    const stepExecution = this.wfExecutionState.getStepExecution(
      buildStepExecutionId(
        this.wfExecutionState.getWorkflowExecution().id,
        this.node.stepId,
        stack.stackFrames
      )
    )!;
    const whenStepStartedTime = new Date(stepExecution.startedAt).getTime();
    const currentTimeMs = new Date().getTime();

    if (currentTimeMs > whenStepStartedTime + timeoutMs) {
      throw new Error('Timeout ERRROR!!!!!!!!');
    }
  }
}
