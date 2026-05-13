/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EnterTimeoutZoneNode } from '@kbn/workflows/graph';
import { ExecutionError } from '@kbn/workflows/server';
import { parseDuration } from '@kbn/workflows-execution-engine-utils';
import type { IStepExecutionRuntime } from '@kbn/workflows-execution-engine-core';
import type { IWorkflowExecutionRuntimeManager } from '@kbn/workflows-execution-engine-core';
import type { IMonitorableNode, INodeImplementation } from '@kbn/workflows-execution-engine-core';

export class EnterStepTimeoutZoneNodeImpl implements INodeImplementation, IMonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: IWorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: IStepExecutionRuntime
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredContext: IStepExecutionRuntime): void {
    const timeoutMs = parseDuration(this.node.timeout);

    const stepExecution = this.stepExecutionRuntime.stepExecution;

    if (!stepExecution) {
      throw new Error(`Step execution for step ${this.node.stepId} not found`);
    }

    const whenStepStartedTime = new Date(stepExecution.startedAt).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      monitoredContext.abortController.abort();
      throw new ExecutionError({
        type: 'TimeoutError',
        message: `Step execution exceeded the configured timeout of ${this.node.timeout}.`,
      });
    }
  }
}
