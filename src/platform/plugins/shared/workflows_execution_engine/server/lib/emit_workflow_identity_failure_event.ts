/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import { setWorkflowEventChainContext } from '@kbn/workflows-extensions/server';
import { emitWorkflowExecutionFailedEventIfFailed } from './emit_workflow_execution_failed_event';
import {
  extractEventChainDepthFromExecution,
  extractEventChainVisitedWorkflowIdsFromExecution,
  mergeEmitterWorkflowIntoEventChainVisited,
} from './telemetry/utils/extract_execution_metadata';
import type { EmitEvent } from '../trigger_events';

/** Emits a pre-runtime identity failure with the persisted event-chain context and original task request. */
export const emitWorkflowIdentityFailureEvent = async ({
  execution,
  request,
  emitEvent,
  logger,
  maxEventChainDepth,
}: {
  execution: EsWorkflowExecution;
  request: KibanaRequest;
  emitEvent: EmitEvent;
  logger: Logger;
  maxEventChainDepth: number;
}): Promise<void> => {
  if (execution.isTestRun) return;
  const visitedWorkflowIds = mergeEmitterWorkflowIntoEventChainVisited(
    extractEventChainVisitedWorkflowIdsFromExecution(execution, maxEventChainDepth),
    execution.workflowId,
    maxEventChainDepth
  );
  setWorkflowEventChainContext(request, {
    depth: extractEventChainDepthFromExecution(execution) ?? -1,
    sourceExecutionId: execution.id,
    ...(visitedWorkflowIds.length > 0 ? { visitedWorkflowIds } : {}),
  });
  await emitWorkflowExecutionFailedEventIfFailed({
    workflowRuntime: {
      getWorkflowExecutionStatus: () => execution.status,
      getWorkflowExecution: () => execution,
    },
    workflowExecutionState: { getLastFailedStepContext: () => undefined },
    emitEvent,
    request,
    logger,
    workflowRunId: execution.id,
  });
};
