/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowStepExecution } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type {
  StepExecutionEvent,
  StepExecutionFinishedEvent,
  StepExecutionStartedEvent,
} from './step_execution_data_stream';

export function mapEventToStepExecution(
  event: StepExecutionEvent
): Partial<EsWorkflowStepExecution> {
  if (event.type === 'started') {
    const startedEvent = event as StepExecutionStartedEvent;
    return {
      id: startedEvent.stepExecutionId,
      stepId: startedEvent.stepId,
      stepType: startedEvent.stepType,
      status: ExecutionStatus.RUNNING,
      startedAt: startedEvent['@timestamp'] as string,
      topologicalIndex: startedEvent.topologicalIndex,
      globalExecutionIndex: startedEvent.globalExecutionIndex,
      stepExecutionIndex: startedEvent.stepExecutionIndex,
      input: startedEvent.input,
    };
  } else if (event.type === 'finished') {
    const finishedEvent = event as StepExecutionFinishedEvent;
    return {
      id: finishedEvent.stepExecutionId,
      status: finishedEvent.error ? ExecutionStatus.FAILED : ExecutionStatus.COMPLETED,
      finishedAt: finishedEvent['@timestamp'] as string,
      error: finishedEvent.error,
      output: finishedEvent.output,
    };
  } else if (event.type === 'waiting') {
    return {
      id: event.stepExecutionId,
      status: ExecutionStatus.WAITING,
    };
  }

  throw new Error(`Unknown step execution event type: ${(event as StepExecutionEvent).type}`);
}
