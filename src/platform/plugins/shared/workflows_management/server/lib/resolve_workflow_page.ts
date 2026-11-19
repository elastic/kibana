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
import type { WorkflowPageMissReason } from '../pages/types';
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

export type ResolveWorkflowPageResult =
  | { workflow: WorkflowProperties }
  | { reason: WorkflowPageMissReason };

/**
 * Returns the workflow behind a page URL, or why the page must not run. The reason is for the
 * audit log: the visitor gets the same 404 for every miss. The secret is checked first, against
 * the page alone, so a visitor without it costs one page read and learns nothing about the
 * workflow.
 */
export const resolveWorkflowPage = async (
  { getWorkflowSource, pagesSystemClient, serviceAccountBindings }: ResolveWorkflowPageDeps,
  { ref, secret }: { ref: WorkflowPageRef; secret: string }
): Promise<ResolveWorkflowPageResult> => {
  if (ref.spaceId === GLOBAL_WORKFLOW_SPACE_ID) {
    return { reason: 'global_space' };
  }
  const verified = await pagesSystemClient.verifyPageSecret(ref, secret);
  if ('reason' in verified) {
    return verified;
  }
  const workflow = await getWorkflowSource(ref.workflowId, ref.spaceId);
  if (!workflow) {
    return { reason: 'workflow_not_found' };
  }
  // A page of an earlier workflow with the same id, left by a failed retire.
  if (workflow.created_at !== verified.workflowCreatedAt) {
    return { reason: 'stale_page' };
  }
  if (!workflow.enabled) {
    return { reason: 'workflow_disabled' };
  }
  if (!workflow.valid) {
    return { reason: 'workflow_invalid' };
  }
  const hasTrigger = workflow.definition?.triggers.some(
    (trigger) => isPageTrigger(trigger) && getPageTriggerId(trigger) === ref.pageId
  );
  if (!hasTrigger) {
    return { reason: 'trigger_missing' };
  }
  // The page runs without the visitor's identity. Without a matching binding, the run would be
  // accepted and then fail when core mints the service account credential.
  const accountId = workflow.definition?.settings?.run_as;
  if (!accountId || !serviceAccountBindings.isEnabled()) {
    return { reason: 'not_bound' };
  }
  const binding = await serviceAccountBindings.getWorkloadBinding({
    workloadType: 'workflow',
    workloadId: ref.workflowId,
    spaceId: ref.spaceId,
  });
  return binding?.serviceAccountId === accountId ? { workflow } : { reason: 'not_bound' };
};
