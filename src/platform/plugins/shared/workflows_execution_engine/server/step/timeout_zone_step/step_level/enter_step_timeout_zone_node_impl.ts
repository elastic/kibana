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
import { parseDuration, renderDuration } from '../../../utils';
import type { StepExecutionRuntime } from '../../../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionRuntimeManager } from '../../../workflow_context_manager/workflow_execution_runtime_manager';
import type { MonitorableNode, NodeImplementation } from '../../node_implementation';

export const RESOLVED_TIMEOUT_STATE_KEY = 'resolvedTimeout' as const;

/** Returns the timeout rendered at zone entry, or `fallback` when the zone has not rendered one. */
export const getResolvedStepTimeout = (
  state: Record<string, unknown> | undefined,
  fallback: string
): string => {
  const value = state?.[RESOLVED_TIMEOUT_STATE_KEY];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
};

export class EnterStepTimeoutZoneNodeImpl implements NodeImplementation, MonitorableNode {
  constructor(
    private node: EnterTimeoutZoneNode,
    private wfExecutionRuntimeManager: WorkflowExecutionRuntimeManager,
    private stepExecutionRuntime: StepExecutionRuntime
  ) {}

  public async run(): Promise<void> {
    this.stepExecutionRuntime.startStep();
    // Render once at entry and freeze on zone state, so monitor ticks and
    // idle wake-ups all measure against the same deadline.
    const timeout = renderDuration(this.node.timeout, (value) =>
      this.stepExecutionRuntime.contextManager.renderValueAccordingToContext(value)
    );
    this.stepExecutionRuntime.setCurrentStepState({
      ...(this.stepExecutionRuntime.stepExecution?.state ?? {}),
      [RESOLVED_TIMEOUT_STATE_KEY]: timeout,
    });
    this.wfExecutionRuntimeManager.navigateToNextNode();
  }

  public monitor(monitoredContext: StepExecutionRuntime): void {
    const stepExecution = this.stepExecutionRuntime.stepExecution;

    if (!stepExecution) {
      throw new Error(`Step execution for step ${this.node.stepId} not found`);
    }

    const timeout = getResolvedStepTimeout(stepExecution.state, this.node.timeout);
    const timeoutMs = parseDuration(timeout);

    const whenStepStartedTime = new Date(stepExecution.startedAt).getTime();
    const currentTimeMs = new Date().getTime();
    const currentStepDuration = currentTimeMs - whenStepStartedTime;

    if (currentStepDuration > timeoutMs) {
      monitoredContext.abortController.abort();
      throw new ExecutionError({
        type: 'TimeoutError',
        message: `Step execution exceeded the configured timeout of ${timeout}.`,
      });
    }
  }
}
