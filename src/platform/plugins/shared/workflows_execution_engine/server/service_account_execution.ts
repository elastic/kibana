/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import type { TaskInstance } from '@kbn/task-manager-plugin/server';
import { visitNestedSteps, WorkflowExecuteStepInputSchema } from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';

export const WORKFLOW_SERVICE_ACCOUNT_TYPE = 'workflow';
type IdentityExecution = Pick<
  EsWorkflowExecution,
  'id' | 'workflowId' | 'spaceId' | 'workflowDefinition' | 'effectiveIdentity' | 'managed'
>;
type BindingExecution = Partial<
  Pick<EsWorkflowExecution, 'workflowDefinition' | 'effectiveIdentity'>
>;
type RunAsExecution = Pick<EsWorkflowExecution, 'workflowId' | 'spaceId'> & BindingExecution;
export type WorkflowTaskRunAs = NonNullable<TaskInstance['runAs']>;
const executionContexts = new WeakMap<
  KibanaRequest,
  { originalRequest?: KibanaRequest; execution: IdentityExecution }
>();
const taskRunAsByRequest = new WeakMap<KibanaRequest, WorkflowTaskRunAs>();
// Requests Task Manager minted for an execution's binding, keyed to that execution's id. Nobody
// called these runs, so there is no caller identity to hand to the executions they start.
const bindingRequests = new WeakMap<KibanaRequest, string>();
const inheritedIdentitySchema = WorkflowExecuteStepInputSchema.pick({
  'workflow-id': true,
  'allowed-workflow-ids': true,
  'allowed-workflow-tags': true,
  'run-as-mode': true,
});

export const getExecutionServiceAccountId = (execution: BindingExecution): string | undefined =>
  execution.effectiveIdentity?.inheritedFrom
    ? execution.effectiveIdentity.id
    : execution.workflowDefinition?.settings?.run_as;

/** Resolves managed-child delegation from a live parent request and its saved identity choice. */
export const resolveInheritedWorkflowIdentity = (
  request: KibanaRequest,
  workflow: WorkflowExecutionEngineModel,
  context: {
    inheritParentIdentity?: boolean;
    parentWorkflowId?: string;
    parentWorkflowExecutionId?: string;
    parentStepId?: string;
    parentStepName?: string;
    spaceId?: string;
  }
): EsWorkflowExecution['effectiveIdentity'] => {
  if (!context.inheritParentIdentity) return undefined;
  const parent = executionContexts.get(request)?.execution;
  const accountId = parent && getExecutionServiceAccountId(parent);
  if (!parent?.id || !accountId)
    throw Boom.forbidden(
      'Service account inheritance requires a parent executing as a service account.'
    );
  if (parent.managed !== true) {
    throw Boom.forbidden('Only managed parent workflows can delegate a service account.');
  }
  if (
    parent.id !== context.parentWorkflowExecutionId ||
    parent.workflowId !== context.parentWorkflowId ||
    parent.spaceId !== context.spaceId
  ) {
    throw Boom.forbidden(
      'The inherited service account must come from the calling workflow in the same space.'
    );
  }
  let identityChoice: ReturnType<typeof inheritedIdentitySchema.safeParse> | undefined;
  visitNestedSteps(
    [
      ...parent.workflowDefinition.steps,
      ...(parent.workflowDefinition.settings?.['on-failure']?.fallback ?? []),
    ],
    ({ step }) => {
      if (
        step.name === (context.parentStepName ?? context.parentStepId) &&
        (step.type === 'workflow.execute' || step.type === 'workflow.executeAsync') &&
        'with' in step
      ) {
        identityChoice = inheritedIdentitySchema.safeParse(step.with);
      }
    }
  );
  const mode = identityChoice?.success
    ? identityChoice.data['run-as-mode'] ?? 'default'
    : 'default';
  if (!identityChoice?.success || mode === 'default') {
    throw Boom.forbidden(
      'Service account inheritance requires a literal identity choice and, when specified, literal allowed-workflow-ids and allowed-workflow-tags in the parent workflow.'
    );
  }
  const configuredId = identityChoice.data['workflow-id'];
  const allowedIds = identityChoice.data['allowed-workflow-ids'];
  const allowedTags = identityChoice.data['allowed-workflow-tags'];
  const dynamicId = configuredId.includes('{{') || configuredId.includes('{%');
  // Read delegation limits from the saved definition, never from rendered step inputs.
  if (
    (dynamicId ? !allowedIds && !allowedTags : configuredId !== workflow.id) ||
    (allowedIds && !allowedIds.includes(workflow.id)) ||
    (allowedTags && !workflow.definition?.tags?.some((tag) => allowedTags.includes(tag)))
  ) {
    throw Boom.forbidden(
      'The child workflow is not approved to inherit the parent service account. Templated workflow-id requires literal allowed-workflow-ids or allowed-workflow-tags matching the resolved managed child.'
    );
  }
  if (workflow.managed !== true) {
    throw Boom.forbidden('Only managed child workflows can inherit a parent service account.');
  }
  if (mode === 'inherit' && workflow.definition?.settings?.run_as) {
    throw Boom.badRequest('Use run-as-mode: override to replace the child service account.');
  }
  return {
    type: 'service_account',
    id: accountId,
    inheritedFrom: {
      workloadId: parent.effectiveIdentity?.inheritedFrom?.workloadId ?? parent.workflowId,
    },
  };
};

/** Rejects changed delegation before persistence; credential acquisition checks again at run/resume. */
export const ensureInheritedBindingCurrent = async (
  core: CoreStart,
  identity: NonNullable<EsWorkflowExecution['effectiveIdentity']>,
  spaceId: string
): Promise<void> => {
  if (!identity.inheritedFrom) return;
  if (!core.security.serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  const binding = await core.security.serviceAccounts.getWorkloadBinding({
    workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
    workloadId: identity.inheritedFrom.workloadId,
    spaceId,
  });
  if (binding?.serviceAccountId !== identity.id) {
    throw Boom.forbidden('The parent service account binding has changed.');
  }
};

export const getWorkflowOriginalRequest = (request: KibanaRequest): KibanaRequest =>
  executionContexts.get(request)?.originalRequest ?? request;

const getWorkflowCaller = (request: KibanaRequest): KibanaRequest | undefined => {
  if (bindingRequests.has(request)) {
    return undefined;
  }
  const context = executionContexts.get(request);
  return context ? context.originalRequest : request;
};

/**
 * Rejects an unbound execution started by a run Task Manager runs as its binding: that run has no
 * caller, and handing it the binding would delegate the service account to an unbound workflow.
 */
export const ensureWorkflowCallerAvailable = (
  request: KibanaRequest,
  execution: Pick<EsWorkflowExecution, 'workflowId'> & BindingExecution
): void => {
  if (getExecutionServiceAccountId(execution) || getWorkflowCaller(request)) {
    return;
  }
  throw Boom.forbidden(
    `Workflow "${execution.workflowId}" has no service account, and the workflow run that started it runs in the background as its own service account, so there is no caller to run it as. Bind "${execution.workflowId}" to a service account.`
  );
};

const toTaskRunAs = (
  execution: RunAsExecution,
  serviceAccountId: string
): WorkflowTaskRunAs & { expectedServiceAccountId: string } => ({
  workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
  workloadId: execution.effectiveIdentity?.inheritedFrom?.workloadId ?? execution.workflowId,
  spaceId: execution.spaceId,
  expectedServiceAccountId: serviceAccountId,
});

/** The workload a bound execution's tasks run as, or `undefined` when the execution is unbound. */
export const getExecutionTaskRunAs = (execution: RunAsExecution): WorkflowTaskRunAs | undefined => {
  const serviceAccountId = getExecutionServiceAccountId(execution);
  return serviceAccountId ? toTaskRunAs(execution, serviceAccountId) : undefined;
};

/**
 * The workload a task for `execution` runs as when it is scheduled with a service account's
 * request. Task Manager can't clone that credential, so a bound execution mints its own instead.
 */
export const getServiceAccountCallerTaskRunAs = (
  core: CoreStart,
  request: KibanaRequest,
  execution: RunAsExecution
): WorkflowTaskRunAs | undefined => {
  const principal = core.security.authc.getPrincipal(getWorkflowOriginalRequest(request));
  return principal?.type === 'service_account' ? getExecutionTaskRunAs(execution) : undefined;
};

/** The workload the follow-up tasks of the execution running with `request` run as, if any. */
export const getWorkflowTaskRunAs = (request: KibanaRequest): WorkflowTaskRunAs | undefined =>
  taskRunAsByRequest.get(request);

/** Runs `execute` with the follow-up tasks it schedules through `request` running as `runAs`. */
export const withWorkflowTaskRunAs = async <T>(
  request: KibanaRequest,
  runAs: WorkflowTaskRunAs | undefined,
  execute: () => Promise<T>
): Promise<T> => {
  if (!runAs) {
    return execute();
  }
  taskRunAsByRequest.set(request, runAs);
  try {
    return await execute();
  } finally {
    taskRunAsByRequest.delete(request);
  }
};

/**
 * Whether minting a binding's request failed for a reason a retry won't fix: the binding is
 * missing, changed, or not allowed, or the token exchange said not to retry.
 */
export const isPermanentMintFailure = (error: unknown): boolean => {
  if (Boom.isBoom(error)) {
    const { statusCode } = error.output;
    return statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 429;
  }
  return (
    error instanceof Error &&
    error.name === 'ServiceAccountTokenExchangeError' &&
    'retryable' in error &&
    error.retryable === false
  );
};

/** Runs `execute` with `request`, which Task Manager minted for the binding of `executionId`. */
export const withWorkflowBindingRequest = async <T>(
  request: KibanaRequest,
  executionId: string,
  runAs: WorkflowTaskRunAs,
  execute: () => Promise<T>
): Promise<T> => {
  bindingRequests.set(request, executionId);
  try {
    return await withWorkflowTaskRunAs(request, runAs, execute);
  } finally {
    bindingRequests.delete(request);
  }
};

export const withWorkflowExecutionIdentity = async <T>(
  core: CoreStart,
  execution: IdentityExecution,
  request: KibanaRequest,
  execute: (request: KibanaRequest) => Promise<T>
): Promise<T> => {
  const originalRequest = getWorkflowCaller(request);
  const serviceAccountId = getExecutionServiceAccountId(execution);
  if (!serviceAccountId) {
    ensureWorkflowCallerAvailable(request, execution);
    return execute(originalRequest ?? request);
  }
  if (!core.security.serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  if (bindingRequests.get(request) === execution.id) {
    executionContexts.set(request, { execution });
    try {
      return await execute(request);
    } finally {
      executionContexts.delete(request);
    }
  }
  const taskRunAs = getServiceAccountCallerTaskRunAs(core, request, execution);
  return core.security.serviceAccounts.withScopedRequestForWorkload(
    { ...toTaskRunAs(execution, serviceAccountId), executionId: execution.id },
    async (scopedRequest) => {
      executionContexts.set(scopedRequest, { originalRequest, execution });
      try {
        return await withWorkflowTaskRunAs(scopedRequest, taskRunAs, () => execute(scopedRequest));
      } finally {
        executionContexts.delete(scopedRequest);
      }
    }
  );
};
