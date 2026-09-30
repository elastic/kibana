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
  'id' | 'workflowId' | 'spaceId' | 'workflowDefinition' | 'effectiveIdentity'
>;
const originalRequests = new WeakMap<KibanaRequest, KibanaRequest>();
const executingWorkflows = new WeakMap<KibanaRequest, IdentityExecution>();
const inheritedApprovalSchema = WorkflowExecuteStepInputSchema.pick({
  'workflow-id': true,
  inheritRunAs: true,
  expectedRevision: true,
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
): EsWorkflowExecution['effectiveIdentity'] => {
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
  if (
    !approved?.success ||
    approved.data.inheritRunAs !== true ||
    !approved.data.expectedRevision ||
    approved.data['workflow-id'] !== workflow.id
  ) {
    throw Boom.forbidden(
      'inheritRunAs requires a literal workflow-id and an approved expectedRevision in the parent workflow.'
    );
  }
  if (workflow.definition?.settings?.run_as)
    throw Boom.badRequest('Cannot inherit a service account when the child has its own run_as.');
  const revision = createHash('sha256').update(workflow.yaml).digest('hex');
  if (revision !== approved.data.expectedRevision)
    throw Boom.conflict(
      'The child workflow changed after approval. Review it and update expectedRevision in the parent workflow.'
    );
  return {
    type: 'service_account',
    id: accountId,
    inheritedFrom: {
      workloadId: parent.effectiveIdentity?.inheritedFrom?.workloadId ?? parent.workflowId,
      workflowId: parent.workflowId,
      executionId: parent.id,
      revision,
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
