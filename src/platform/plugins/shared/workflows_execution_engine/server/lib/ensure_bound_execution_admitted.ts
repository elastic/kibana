/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, WorkflowRepository } from '@kbn/workflows';
import { WorkflowDisabledError } from '@kbn/workflows/common/errors';
import type { WorkflowExecutionRepository } from '../repositories/workflow_execution_repository';

/** Admits a searchable bound execution only while its persisted workflow still accepts runs. */
export const ensureBoundExecutionAdmitted = async (
  execution: Partial<EsWorkflowExecution>,
  workflows: WorkflowRepository,
  executions: WorkflowExecutionRepository
): Promise<void> => {
  if (!execution.workflowDefinition?.settings?.run_as) return;
  const { id, workflowId, spaceId } = execution;
  if (!id || !workflowId || !spaceId) throw new Error('Missing bound execution coordinates.');
  try {
    // Paired with deletion's disable-then-search order: either deletion sees this
    // already-refreshed execution, or this real-time read sees the disabled/deleted workflow.
    if (!(await workflows.isWorkflowEnabledRealtime(workflowId, spaceId))) {
      throw new WorkflowDisabledError(workflowId);
    }
  } catch (error) {
    await executions.discardUnstartedExecution(id, spaceId);
    throw error;
  }
};
