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

import { parseDuration } from '../../../utils';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';

export class EnterStepTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime
  ) {}

  public async run(): Promise<void> {
    await this.stepExecutionRuntime.startStep();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredContext: StepExecutionRuntime): Promise<void> {
    const timeoutMs = parseDuration(this.node.timeout);
    const stepExecution = this.stepExecutionRuntime.stepExecution!;
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
