/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import type { NodeImplementation, MonitorableNode } from '../../node_implementation';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../../../workflow_context_manager/workflow_execution_state';

import { parseDuration } from '../../../utils';
import type { WorkflowContextManager } from '../../../workflow_context_manager/workflow_context_manager';

export class EnterStepTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private wfExecutionState: WorkflowExecutionState,
    private stepContext: WorkflowContextManager
  ) {}

  public async run(): Promise<void> {
    await this.wfExecutionRuntimeManager.startStep();
    this.wfExecutionRuntimeManager.enterScope();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredContext: WorkflowContextManager): Promise<void> {
    const timeoutMs = parseDuration(this.node.timeout);
    const stepExecution = this.wfExecutionState.getStepExecution(this.stepContext.stepExecutionId)!;
    const whenStepStartedTime = new Date(stepExecution.startedAt).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      monitoredContext.abortController.abort();
      throw new Error(
        `TimeoutError: Step execution exceeded the configured timeout of ${this.node.timeout}.`
      );
    }

    return Promise.resolve();
  }
}
