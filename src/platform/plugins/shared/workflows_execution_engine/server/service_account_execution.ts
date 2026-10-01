/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import { createHash } from 'node:crypto';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { visitNestedSteps, WorkflowExecuteStepInputSchema } from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';

export const WORKFLOW_SERVICE_ACCOUNT_TYPE = 'workflow';
type IdentityExecution = Pick<
  EsWorkflowExecution,
  | 'id'
  | 'workflowId'
  | 'spaceId'
  | 'workflowDefinition'
  | 'effectiveIdentity'
  | 'childWorkflowApprovals'
>;
const originalRequests = new WeakMap<KibanaRequest, KibanaRequest>();
const executingWorkflows = new WeakMap<KibanaRequest, IdentityExecution>();
const inheritedApprovalSchema = WorkflowExecuteStepInputSchema.pick({
  'workflow-id': true,
  inheritRunAs: true,
  runAsMode: true,
});

export const getExecutionServiceAccountId = (execution: IdentityExecution): string | undefined =>
  execution.effectiveIdentity?.inheritedFrom
    ? execution.effectiveIdentity.id
    : execution.workflowDefinition?.settings?.run_as;

/** Resolves delegation only from a live parent request and the approval in its protected snapshot. */
export const resolveInheritedWorkflowIdentity = (
  request: KibanaRequest,
  workflow: WorkflowExecutionEngineModel,
  context: {
    inheritRunAs?: boolean;
    parentWorkflowId?: string;
    parentWorkflowExecutionId?: string;
    parentStepId?: string;
    spaceId?: string;
  }
):
  | {
      effectiveIdentity: NonNullable<EsWorkflowExecution['effectiveIdentity']>;
      workflow: WorkflowExecutionEngineModel;
      createdAt: string;
      childWorkflowApprovals: NonNullable<EsWorkflowExecution['childWorkflowApprovals']>;
    }
  | undefined => {
  if (!context.inheritRunAs) return undefined;
  const parent = executingWorkflows.get(request);
  const accountId = parent && getExecutionServiceAccountId(parent);
  if (!parent?.id || !accountId)
    throw Boom.forbidden('inheritRunAs requires a parent executing as a service account.');
  if (
    parent.id !== context.parentWorkflowExecutionId ||
    parent.workflowId !== context.parentWorkflowId ||
    parent.spaceId !== context.spaceId
  ) {
    throw Boom.forbidden(
      'The inherited service account must come from the calling workflow in the same space.'
    );
  }
  let approved: ReturnType<typeof inheritedApprovalSchema.safeParse> | undefined;
  visitNestedSteps(parent.workflowDefinition.steps, ({ step }) => {
    if (
      step.name === context.parentStepId &&
      (step.type === 'workflow.execute' || step.type === 'workflow.executeAsync')
    ) {
      approved = inheritedApprovalSchema.safeParse(step.with);
    }
  });
  const mode = approved?.success
    ? approved.data.runAsMode ?? (approved.data.inheritRunAs ? 'inherit' : 'default')
    : 'default';
  const approvals = parent.childWorkflowApprovals;
  const snapshot = approvals?.snapshots.find(
    (entry) =>
      entry.path.length === 1 &&
      entry.path[0] === context.parentStepId &&
      entry.workflowId === workflow.id &&
      entry.runAsMode === mode
  );
  if (
    !approved?.success ||
    mode === 'default' ||
    (approved.data.runAsMode !== undefined && approved.data.inheritRunAs !== undefined) ||
    approved.data['workflow-id'] !== workflow.id ||
    !snapshot ||
    approvals?.serviceAccountId !== accountId
  ) {
    throw Boom.forbidden(
      'Review and approve this child workflow before inheriting the service account.'
    );
  }
  if (mode === 'inherit' && snapshot.definition.settings?.run_as) {
    throw Boom.badRequest('Use runAsMode: override to replace the child service account.');
  }
  const revision = createHash('sha256').update(snapshot.yaml).digest('hex');
  return {
    createdAt: snapshot.createdAt,
    workflow: {
      ...workflow,
      yaml: snapshot.yaml,
      definition: snapshot.definition,
      name: snapshot.definition.name,
      version: snapshot.version,
    },
    childWorkflowApprovals: {
      ...approvals,
      snapshots: approvals.snapshots
        .filter((entry) => entry.path.length > 1 && entry.path[0] === context.parentStepId)
        .map((entry) => ({ ...entry, path: entry.path.slice(1) })),
    },
    effectiveIdentity: {
      type: 'service_account',
      id: accountId,
      inheritedFrom: {
        workloadId: parent.effectiveIdentity?.inheritedFrom?.workloadId ?? parent.workflowId,
        workflowId: parent.workflowId,
        executionId: parent.id,
        revision,
      },
    },
  };
};

export const getWorkflowOriginalRequest = (request: KibanaRequest): KibanaRequest =>
  originalRequests.get(request) ?? request;

export const withWorkflowExecutionIdentity = async <T>(
  core: CoreStart,
  execution: IdentityExecution,
  request: KibanaRequest,
  execute: (request: KibanaRequest) => Promise<T>
): Promise<T> => {
  const originalRequest = getWorkflowOriginalRequest(request);
  const serviceAccountId = getExecutionServiceAccountId(execution);
  if (!serviceAccountId) {
    return execute(originalRequest);
  }
  if (!core.security.serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  return core.security.serviceAccounts.withScopedRequestForWorkload(
    {
      workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
      workloadId: execution.effectiveIdentity?.inheritedFrom?.workloadId ?? execution.workflowId,
      spaceId: execution.spaceId,
      expectedServiceAccountId: serviceAccountId,
    },
    async (scopedRequest) => {
      originalRequests.set(scopedRequest, originalRequest);
      executingWorkflows.set(scopedRequest, execution);
      try {
        return await execute(scopedRequest);
      } finally {
        originalRequests.delete(scopedRequest);
        executingWorkflows.delete(scopedRequest);
      }
    }
  );
};
