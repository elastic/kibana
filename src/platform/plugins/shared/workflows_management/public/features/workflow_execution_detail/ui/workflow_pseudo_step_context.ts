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
}

export function buildTriggerContextFromExecution(
  executionContext: Record<string, unknown> | undefined | null
): TriggerContextFromExecution | null {
  if (!executionContext) {
    return null;
  }

  let triggerType: TriggerType = 'manual'; // Default to manual trigger type

  const hasEvent = executionContext.event !== undefined;
  const isScheduled =
    (executionContext.event as { type?: string } | undefined)?.type === 'scheduled';

  if (isScheduled) {
    triggerType = 'scheduled';
  } else if (hasEvent) {
    triggerType = 'alert';
  }

  const inputData = (executionContext as { event?: JsonValue; inputs?: JsonValue }).event
    ? executionContext.event
    : executionContext.inputs;

  return {
    triggerType,
    input: inputData as JsonValue,
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
    output: undefined,
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId || '',
    startedAt: '',
    globalExecutionIndex: -1,
    stepExecutionIndex: 0,
    topologicalIndex: -1,
  } as WorkflowStepExecutionDto;
}

export function buildOverviewStepExecutionFromContext(
  workflowExecution: WorkflowExecutionDto
): WorkflowStepExecutionDto {
  let contextData: Record<string, unknown> = {};
  if (workflowExecution.context) {
    const { inputs, event, ...context } = workflowExecution.context;
    contextData = context as Record<string, unknown>;
  }

  // Add trace information to the context data for display in the Overview table
  if (workflowExecution.traceId) {
    contextData = {
      ...contextData,
      trace: {
        traceId: workflowExecution.traceId,
        entryTransactionId: workflowExecution.entryTransactionId,
      },
    };
  }

  return {
    id: '__overview',
    stepId: 'Overview',
    stepType: '__overview',
    status: workflowExecution.status,
    stepExecutionIndex: 0,
    startedAt: workflowExecution.startedAt,
    input: contextData as JsonValue,
    scopeStack: [],
    workflowRunId: workflowExecution.id,
    workflowId: workflowExecution.workflowId ?? '',
    topologicalIndex: -1,
    globalExecutionIndex: -1,
  };
}
