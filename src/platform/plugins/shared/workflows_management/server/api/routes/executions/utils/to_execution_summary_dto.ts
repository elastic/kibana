/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowExecutionSummaryDto } from '@kbn/workflows';

/**
 * Fields shared by WorkflowExecutionDto and WorkflowExecutionListItemDto that are safe to
 * include in the summary view (no workflow definition data).
 */
type ExecutionSummarySource = Pick<
  WorkflowExecutionSummaryDto,
  | 'id'
  | 'spaceId'
  | 'workflowId'
  | 'workflowName'
  | 'managed'
  | 'managedBy'
  | 'originManagedWorkflowId'
  | 'managedVersion'
  | 'status'
  | 'isTestRun'
  | 'startedAt'
  | 'finishedAt'
  | 'duration'
  | 'executedBy'
  | 'triggeredBy'
  | 'error'
  | 'traceId'
  | 'entryTransactionId'
  | 'usage'
>;

/**
 * Projects a full execution DTO (or list-item DTO) down to the narrow
 * `WorkflowExecutionSummaryDto` shape, stripping all fields that embed or reference the
 * workflow definition (`yaml`, `workflowDefinition`, `stepExecutions`, `stepId`, `context`,
 * `stepUsage`).
 *
 * Used by execution routes to return a safe view to callers who hold `readExecution` but not
 * `read`.
 */
export const toExecutionSummaryDto = ({
  id,
  spaceId,
  workflowId,
  workflowName,
  managed,
  managedBy,
  originManagedWorkflowId,
  managedVersion,
  status,
  isTestRun,
  startedAt,
  finishedAt,
  duration,
  executedBy,
  triggeredBy,
  error,
  traceId,
  entryTransactionId,
  usage,
}: ExecutionSummarySource): WorkflowExecutionSummaryDto => ({
  id,
  spaceId,
  workflowId,
  workflowName,
  managed,
  managedBy,
  originManagedWorkflowId,
  managedVersion,
  status,
  isTestRun,
  startedAt,
  finishedAt,
  duration,
  executedBy,
  triggeredBy,
  error,
  traceId,
  entryTransactionId,
  usage,
});
