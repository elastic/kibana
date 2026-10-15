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
import type { RunContext, TaskInstance } from '@kbn/task-manager-plugin/server';
import { visitNestedSteps, WorkflowExecuteStepInputSchema } from '@kbn/workflows';
import type { EsWorkflowExecution, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { getEmitterWorkflowExecutionIdFromRequest } from './trigger_events/event_context/event_chain_context';

export const WORKFLOW_SERVICE_ACCOUNT_TYPE = 'workflow';
type IdentityExecution = Pick<
  EsWorkflowExecution,
  | 'id'
  | 'workflowId'
  | 'spaceId'
  | 'workflowDefinition'
  | 'effectiveIdentity'
  | 'managed'
  | 'executedBy'
>;
const executionContexts = new WeakMap<KibanaRequest, { execution: IdentityExecution }>();
const inheritedIdentitySchema = WorkflowExecuteStepInputSchema.pick({
  'workflow-id': true,
  'run-as-mode': true,
});

export const getExecutionServiceAccountId = (
  execution: Partial<Pick<IdentityExecution, 'effectiveIdentity' | 'workflowDefinition'>>
): string | undefined =>
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
  const parent = executionContexts.get(request)?.execution;
  const accountId = parent && getExecutionServiceAccountId(parent);
  const followsParent = Boolean(
    accountId && context.parentWorkflowExecutionId && !workflow.definition?.settings?.run_as
  );
  if (!context.inheritParentIdentity && !followsParent) return undefined;
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
  if (
    !identityChoice?.success ||
    (mode === 'default' && !followsParent) ||
    identityChoice.data['workflow-id'] !== workflow.id
  ) {
    throw Boom.forbidden(
      'Service account inheritance requires a literal workflow-id and identity choice in the parent workflow.'
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

/** Inherits a verified event emitter's identity only between managed workflows in the same space. */
export const resolveInheritedEventWorkflowIdentity = async (
  request: KibanaRequest,
  workflow: WorkflowExecutionEngineModel,
  spaceId: string,
  {
    security,
    getExecution,
  }: {
    security: CoreStart['security'];
    getExecution: (id: string, spaceId: string) => Promise<IdentityExecution | null>;
  }
): Promise<EsWorkflowExecution['effectiveIdentity']> => {
  if (workflow.definition?.settings?.run_as) return undefined;
  let emitter = executionContexts.get(request)?.execution;
  if (!emitter) {
    const principal = security.authc.getPrincipal(request);
    if (principal?.type !== 'service_account') return undefined;
    const emitterId = getEmitterWorkflowExecutionIdFromRequest(request);
    const storedEmitter = emitterId ? await getExecution(emitterId, spaceId) : null;
    if (
      !storedEmitter ||
      getExecutionServiceAccountId(storedEmitter) !== principal.serviceAccountId
    ) {
      throw Boom.forbidden(
        'A workflow that subscribes to events from a service account must have its own service account unless a matching managed workflow emitter can be verified.'
      );
    }
    emitter = storedEmitter;
  }
  const accountId = getExecutionServiceAccountId(emitter);
  if (!accountId) return undefined;
  if (emitter?.managed !== true || workflow.managed !== true) {
    throw Boom.forbidden(
      'A workflow that subscribes to events from a service account must have its own service account unless both the emitting workflow and subscriber are managed.'
    );
  }
  if (emitter.spaceId !== spaceId) {
    throw Boom.forbidden(
      'An event subscriber can only inherit a service account in the emitting workflow space.'
    );
  }
  return {
    type: 'service_account',
    id: accountId,
    inheritedFrom: {
      workloadId: emitter.effectiveIdentity?.inheritedFrom?.workloadId ?? emitter.workflowId,
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

export const getWorkflowInitiatingUser = (request: KibanaRequest): string | undefined =>
  executionContexts.get(request)?.execution.executedBy;

export const getWorkflowTaskRunAs = (
  execution: Partial<Pick<IdentityExecution, 'workflowDefinition' | 'effectiveIdentity'>> &
    Pick<IdentityExecution, 'workflowId' | 'spaceId'>
): TaskInstance['runAs'] => {
  const accountId = getExecutionServiceAccountId(execution);
  return accountId
    ? {
        workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
        workloadId: execution.effectiveIdentity?.inheritedFrom?.workloadId ?? execution.workflowId,
        spaceId: execution.spaceId,
        expectedServiceAccountId: accountId,
      }
    : undefined;
};

export const withWorkflowExecutionIdentity = async <T>(
  core: CoreStart,
  execution: IdentityExecution,
  request: KibanaRequest | undefined,
  execute: (request: KibanaRequest) => Promise<T>,
  runAs?: RunContext['runAs']
): Promise<T> => {
  const serviceAccountId = getExecutionServiceAccountId(execution);
  if (!serviceAccountId) {
    if (runAs || !request)
      throw Boom.forbidden('Workflow execution identity does not match its task.');
    return execute(request);
  }
  if (!core.security.serviceAccounts.isEnabled()) {
    throw Boom.forbidden('Service account execution is disabled.');
  }
  const scoped = async (scopedRequest: KibanaRequest) => {
    executionContexts.set(scopedRequest, { execution });
    try {
      return await execute(scopedRequest);
    } finally {
      executionContexts.delete(scopedRequest);
    }
  };
  if (!runAs)
    throw Boom.forbidden('Service account workflow tasks require a Task Manager identity.');
  return runAs.withScopedRequest(scoped, { expectedServiceAccountId: serviceAccountId });
};
