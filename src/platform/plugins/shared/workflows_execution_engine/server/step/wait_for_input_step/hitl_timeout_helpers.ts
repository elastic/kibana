/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT, DEFAULT_WAIT_FOR_INPUT_TIMEOUT } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { isWaitForApproval, isWaitForInput } from '@kbn/workflows/graph';
import { parseDuration } from '../../utils';
import type { StepExecutionRuntime } from '../../workflow_context_manager/step_execution_runtime';

export const DYNAMIC_TIMEOUT_STATE_KEY = 'dynamicTimeout' as const;

export function computeHitlWaitDeadlineMs(
  startedAt: string | undefined,
  timeout: string
): number | undefined {
  if (!startedAt) {
    return undefined;
  }

  return new Date(startedAt).getTime() + parseDuration(timeout);
}

export function hasHitlWaitExpired(
  startedAt: string | undefined,
  timeout: string,
  nowMs: number = Date.now()
): boolean {
  const deadlineMs = computeHitlWaitDeadlineMs(startedAt, timeout);
  if (deadlineMs === undefined) {
    return false;
  }

  return nowMs >= deadlineMs;
}

export function resolveDynamicTimeout(
  configuredTimeout: string | undefined,
  defaultTimeout: string,
  render: (value: string) => unknown
): string {
  const raw = configuredTimeout ?? defaultTimeout;
  const rendered = render(raw);
  const timeout = typeof rendered === 'string' ? rendered.trim() : String(rendered ?? '');
  parseDuration(timeout);
  return timeout;
}

export function getPersistedDynamicTimeout(
  state: Record<string, unknown> | undefined
): string | undefined {
  const value = state?.[DYNAMIC_TIMEOUT_STATE_KEY];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Renders timeout at step entry and freezes it on step state for idle/resume readers. */
export function persistResolvedDynamicTimeout(
  stepExecutionRuntime: StepExecutionRuntime,
  configuredTimeout: string | undefined,
  defaultTimeout: string
): string {
  const timeout = resolveDynamicTimeout(configuredTimeout, defaultTimeout, (value) =>
    stepExecutionRuntime.contextManager.renderValueAccordingToContext(value)
  );
  stepExecutionRuntime.setCurrentStepState({
    ...(stepExecutionRuntime.stepExecution?.state ?? {}),
    [DYNAMIC_TIMEOUT_STATE_KEY]: timeout,
  });
  return timeout;
}

export function getResolvedDynamicTimeout(
  stepExecutionRuntime: StepExecutionRuntime,
  configuredTimeout: string | undefined,
  defaultTimeout: string
): string {
  return (
    getPersistedDynamicTimeout(stepExecutionRuntime.stepExecution?.state) ??
    configuredTimeout ??
    defaultTimeout
  );
}

function getHitlTimeoutForNode(
  node: GraphNodeUnion,
  state?: Record<string, unknown>
): string | undefined {
  if (isWaitForApproval(node)) {
    return (
      getPersistedDynamicTimeout(state) ??
      node.configuration.timeout ??
      DEFAULT_WAIT_FOR_APPROVAL_TIMEOUT
    );
  }

  if (isWaitForInput(node)) {
    return (
      getPersistedDynamicTimeout(state) ??
      node.configuration.timeout ??
      DEFAULT_WAIT_FOR_INPUT_TIMEOUT
    );
  }

  return undefined;
}

export function getHitlIdleDeadlineMsForNode(
  node: GraphNodeUnion,
  startedAt: string | undefined,
  state?: Record<string, unknown>
): number | undefined {
  if (!startedAt) {
    return undefined;
  }

  const timeout = getHitlTimeoutForNode(node, state);
  if (timeout === undefined) {
    return undefined;
  }

  return computeHitlWaitDeadlineMs(startedAt, timeout);
}

export function getHitlIdleDeadlineMsForStep(
  stepExecutionRuntime: StepExecutionRuntime
): number | undefined {
  const { node, stepExecution } = stepExecutionRuntime;
  return getHitlIdleDeadlineMsForNode(node, stepExecution?.startedAt, stepExecution?.state);
}
