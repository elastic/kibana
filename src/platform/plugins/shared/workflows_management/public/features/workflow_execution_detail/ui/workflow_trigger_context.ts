/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowExecutionDto, WorkflowStepExecutionDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';

export type TriggerType = 'alert' | 'scheduled' | 'manual';

export interface TriggerContextFromExecution {
  triggerType: TriggerType;
  input: JsonValue;
  output: JsonValue;
}

export function buildTriggerContextFromExecution(
  executionContext: Record<string, unknown> | undefined | null
): TriggerContextFromExecution | null {
  if (!executionContext) {
    return null;
  }

  let triggerType: TriggerType = 'alert';

  const isScheduled =
    (executionContext.event as { type?: string } | undefined)?.type === 'scheduled';
  const hasInputs =
    executionContext.inputs &&
    Object.keys(executionContext.inputs as Record<string, unknown>).length > 0;

  if (hasInputs) {
    triggerType = 'manual';
  } else if (isScheduled) {
    triggerType = 'scheduled';
  }

  const inputData = (executionContext as { event?: JsonValue; inputs?: JsonValue }).event
    ? executionContext.event
    : executionContext.inputs;

  const { inputs, event, ...contextData } = executionContext;

  return {
    triggerType,
    input: inputData as JsonValue,
    output: contextData as JsonValue,
  };
}

export function buildTriggerStepExecutionFromContext(
  workflowExecution: WorkflowExecutionDto
): WorkflowStepExecutionDto | null {
  const triggerContext = buildTriggerContextFromExecution(
    workflowExecution.context as Record<string, unknown> | undefined | null
  );

  if (!triggerContext) {
    return null;
  }

  return {
    id: 'trigger',
    stepId: triggerContext.triggerType,
    stepType: `trigger_${triggerContext.triggerType}`,
    status: ExecutionStatus.COMPLETED,
    input: triggerContext.input,
    output: triggerContext.output,
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId || '',
    startedAt: '',
    globalExecutionIndex: -1,
    stepExecutionIndex: 0,
    topologicalIndex: -1,
  } as WorkflowStepExecutionDto;
}
