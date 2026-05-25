/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';

const ACTIVE_EXECUTION_STATUSES: ReadonlySet<ExecutionStatus> = new Set([
  ExecutionStatus.PENDING,
  ExecutionStatus.RUNNING,
  ExecutionStatus.WAITING_FOR_INPUT,
  ExecutionStatus.WAITING_FOR_CHILD,
]);

export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const hasActiveWorkflowExecutions = (
  results: readonly WorkflowExecutionListItemDto[] | undefined
): boolean => {
  if (!results?.length) {
    return false;
  }
  return results.some((execution) => ACTIVE_EXECUTION_STATUSES.has(execution.status));
};
