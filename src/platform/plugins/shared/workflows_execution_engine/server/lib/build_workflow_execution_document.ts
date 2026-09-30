/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import omit from 'lodash/omit';
import { v4 as generateUuid } from 'uuid';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import {
  ExecutionStatus,
  pickManagedWorkflowFields,
  pickWorkflowDocumentVersion,
} from '@kbn/workflows';
import {
  MISSING_EXECUTION_IDENTITY_ERROR_TYPE,
  MISSING_EXECUTION_IDENTITY_MESSAGE,
  UNKNOWN_EXECUTION_IDENTITY,
} from './execution_identity';
import { normalizeEventChainVisitedWorkflowIds } from './telemetry/utils/extract_execution_metadata';
import type { WorkflowExecutionForInputRendering } from '../workflow_context_manager/build_workflow_context';

export interface BuildWorkflowExecutionDocumentParams {
  workflow: WorkflowExecutionEngineModel;
  inheritedIdentity?: EsWorkflowExecution['effectiveIdentity'];
  spaceId: string;
  context: Record<string, unknown>;
  defaultTriggeredBy: string;
  authenticatedUser: string | undefined;
  now: Date;
  maxEventChainDepth: number;
  getConcurrencyGroupKey: (workflowExecution: WorkflowExecutionForInputRendering) => string | null;
}

const stampExecutionWorkflowVersion = (
  workflowExecution: WorkflowExecutionForInputRendering,
  workflow: WorkflowExecutionEngineModel
): void => {
  const { version } = pickWorkflowDocumentVersion(workflow);
  if (version !== undefined) {
    workflowExecution.version = version;
  }
};

export const buildWorkflowExecutionDocument = (
  params: BuildWorkflowExecutionDocumentParams
): WorkflowExecutionForInputRendering => {
  const {
    workflow,
    inheritedIdentity,
    spaceId,
    context,
    defaultTriggeredBy,
    authenticatedUser,
    now,
    maxEventChainDepth,
    getConcurrencyGroupKey,
  } = params;
  const triggeredBy = (context.triggeredBy as string | undefined) || defaultTriggeredBy;
  // Strip the context's space so property order cannot override the trusted execution space.
  const executionContext = { spaceId, ...omit(context, 'spaceId') };
  const metadata = context.metadata as Record<string, unknown> | undefined;
  const eventPayload = context.event as Record<string, unknown> | undefined;
  let rootEventChainDepth: number | undefined;
  if (eventPayload) {
    const rawDepth = eventPayload.eventChainDepth;
    if (typeof rawDepth === 'number' && !Number.isNaN(rawDepth) && rawDepth >= 0) {
      rootEventChainDepth = rawDepth;
    } else if (typeof rawDepth === 'string' && rawDepth.trim() !== '') {
      const parsed = parseInt(rawDepth, 10);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        rootEventChainDepth = parsed;
      }
    }
  }
  const rootVisited = normalizeEventChainVisitedWorkflowIds(
    eventPayload?.eventChainVisitedWorkflowIds,
    maxEventChainDepth
  );
  const dispatchEventId =
    typeof metadata?.eventId === 'string' ? metadata.eventId.trim() || undefined : undefined;
  const missingIdentity = authenticatedUser == null;
  const workflowExecution: WorkflowExecutionForInputRendering = {
    id: generateUuid(),
    spaceId,
    workflowId: workflow.id,
    ...pickManagedWorkflowFields(workflow),
    isTestRun: workflow.isTestRun,
    isEphemeral: workflow.isEphemeral,
    workflowDefinition: workflow.definition,
    yaml: workflow.yaml,
    context: executionContext,
    status: missingIdentity ? ExecutionStatus.FAILED : ExecutionStatus.PENDING,
    createdAt: now.toISOString(),
    executedBy: authenticatedUser ?? UNKNOWN_EXECUTION_IDENTITY,
    ...(inheritedIdentity ? { effectiveIdentity: inheritedIdentity } : {}),
    ...(workflow.definition?.settings?.run_as
      ? {
          effectiveIdentity: {
            type: 'service_account' as const,
            id: workflow.definition.settings.run_as,
          },
        }
      : {}),
    triggeredBy,
    ...(missingIdentity
      ? {
          error: {
            type: MISSING_EXECUTION_IDENTITY_ERROR_TYPE,
            message: MISSING_EXECUTION_IDENTITY_MESSAGE,
          },
          finishedAt: now.toISOString(),
        }
      : {}),
    ...(metadata ? { metadata } : {}),
    ...(rootEventChainDepth !== undefined ? { eventChainDepth: rootEventChainDepth } : {}),
    ...(rootVisited.length > 0 ? { eventChainVisitedWorkflowIds: rootVisited } : {}),
    ...(dispatchEventId ? { dispatchEventId } : {}),
  };

  stampExecutionWorkflowVersion(workflowExecution, workflow);

  const concurrencyGroupKey = getConcurrencyGroupKey(workflowExecution);
  if (concurrencyGroupKey) {
    workflowExecution.concurrencyGroupKey = concurrencyGroupKey;
  }

  return workflowExecution;
};
