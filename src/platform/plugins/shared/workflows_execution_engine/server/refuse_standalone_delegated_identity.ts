/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { requiresDelegatedIdentity } from '@kbn/workflows';
import type { WorkflowExecutionEngineModel } from '@kbn/workflows';

export const standaloneDelegatedIdentityMessage = (workflowId: string): string =>
  `Workflow '${workflowId}' delegates its execution identity to a parent workflow and cannot be run standalone.`;

/**
 * Rejects a workflow that can only run as a parent's delegated service account.
 * Call this before persisting an execution or draining its concurrency group:
 * a doomed run with cancel-in-progress would otherwise cancel the in-flight one.
 * Parent `workflow.execute` runs set `inheritParentIdentity` and must pass through
 * so the existing inheritance resolver can bind the parent service account.
 */
export const refuseStandaloneDelegatedIdentityRun = (
  workflow: WorkflowExecutionEngineModel,
  context: { inheritParentIdentity?: unknown }
): void => {
  if (context.inheritParentIdentity === true) {
    return;
  }
  refuseDelegatedIdentityWorkflow(workflow);
};

/** Bulk scheduling does not resolve a parent identity, so the inherit flag is not a bypass. */
export const refuseDelegatedIdentityWorkflow = (workflow: WorkflowExecutionEngineModel): void => {
  if (!requiresDelegatedIdentity(workflow)) {
    return;
  }
  throw Boom.forbidden(standaloneDelegatedIdentityMessage(workflow.id));
};
