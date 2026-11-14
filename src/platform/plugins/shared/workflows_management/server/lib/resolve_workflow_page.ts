/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getPageTriggerId, isPageTrigger } from '@kbn/workflows';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import type { WorkflowPageRef } from '../pages/page_secret';
import type { WorkflowPagesSystemClient } from '../pages/workflow_pages_system_client';
import type { WorkflowProperties } from '../storage/workflow_storage';

export interface ResolveWorkflowPageDeps {
  /** Reads a workflow of the space. Returns null for a soft-deleted or global workflow. */
  getWorkflowSource: (id: string, spaceId: string) => Promise<WorkflowProperties | null>;
  pagesSystemClient: Pick<WorkflowPagesSystemClient, 'verifyPageSecret'>;
  serviceAccountBindings: Pick<
    WorkflowsExecutionEnginePluginStart['serviceAccountBindings'],
    'isEnabled' | 'getWorkloadBinding'
  >;
}

/**
 * Returns the workflow behind a page URL, or undefined when the page must not run.
 * Every miss returns undefined. The secret is checked right after the workflow read, so a visitor
 * without it learns nothing about the workflow's state and costs no binding read.
 */
export const resolveWorkflowPage = async (
  { getWorkflowSource, pagesSystemClient, serviceAccountBindings }: ResolveWorkflowPageDeps,
  { ref, secret }: { ref: WorkflowPageRef; secret: string }
): Promise<WorkflowProperties | undefined> => {
  if (ref.spaceId === GLOBAL_WORKFLOW_SPACE_ID) {
    return undefined;
  }
  const workflow = await getWorkflowSource(ref.workflowId, ref.spaceId);
  if (
    !workflow ||
    !(await pagesSystemClient.verifyPageSecret(ref, secret, workflow.created_at)) ||
    !workflow.enabled ||
    !workflow.valid ||
    !workflow.definition?.triggers.some(
      (trigger) => isPageTrigger(trigger) && getPageTriggerId(trigger) === ref.pageId
    )
  ) {
    return undefined;
  }
  // The page runs without the visitor's identity. Without a matching binding, the run would be
  // accepted and then fail when core mints the service account credential.
  const accountId = workflow.definition.settings?.run_as;
  if (!accountId || !serviceAccountBindings.isEnabled()) {
    return undefined;
  }
  const binding = await serviceAccountBindings.getWorkloadBinding({
    workloadType: 'workflow',
    workloadId: ref.workflowId,
    spaceId: ref.spaceId,
  });
  return binding?.serviceAccountId === accountId ? workflow : undefined;
};
