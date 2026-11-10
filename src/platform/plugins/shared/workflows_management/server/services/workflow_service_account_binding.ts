/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import chunk from 'lodash/chunk';
import isEqual from 'lodash/isEqual';
import pMap from 'p-map';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import type {
  ServiceAccountWorkloadBinding,
  ServiceAccountWorkloadBindingChange,
} from '@kbn/core-security-server';
import { SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX } from '@kbn/core-security-server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';

import type { IndexWorkflowDocumentOptions, ManagedWorkflowOrphan } from './workflow_occ_types';
import { mutateWorkflowToDisabled } from '../api/lib/workflow_disable_all';
import { applyWorkflowVersion } from '../lib/workflow_version';
import type { WorkflowProperties } from '../storage/workflow_storage';

type Bindings = WorkflowsExecutionEnginePluginStart['serviceAccountBindings'];

type WorkflowRevision = { seqNo: number; primaryTerm: number; accountId?: string } | null;

export const BINDING_COMPENSATION_FAILED_MESSAGE =
  'Workflow write and service account binding compensation failed. Reconcile the workflow binding before retrying.';

const RECONCILE_READ_CONCURRENCY = 10;

export const ensureWorkflowServiceAccountMutationAuthorized = async (
  core: CoreStart,
  request?: KibanaRequest
): Promise<KibanaRequest> => {
  if (!request)
    throw Boom.forbidden('An authenticated request is required to modify a bound workflow.');
  const privileges = await core.elasticsearch.client
    .asScoped(request)
    .asCurrentUser.security.hasPrivileges({
      cluster: ['manage_security'],
    });
  if (!privileges.has_all_requested) {
    throw Boom.forbidden('Modifying a service-account workflow requires manage_security.');
  }
  return request;
};

const ensureBindingChangeAllowed = async ({
  bindings,
  core,
  getSpaceId,
  spaceId,
  request,
}: {
  bindings: Bindings;
  core: CoreStart;
  getSpaceId: (request: KibanaRequest) => string;
  spaceId: string;
  request?: KibanaRequest;
}): Promise<KibanaRequest> => {
  if (spaceId === GLOBAL_WORKFLOW_SPACE_ID) {
    throw Boom.badRequest(
      'Service account bindings require a workflow installed in a specific space.'
    );
  }
  if (!bindings.isEnabled()) throw Boom.forbidden('Service account execution is disabled.');
  const authenticatedRequest = await ensureWorkflowServiceAccountMutationAuthorized(core, request);
  if (getSpaceId(authenticatedRequest) !== spaceId) {
    throw Boom.badRequest('The authenticated request must target the workflow binding space.');
  }
  return authenticatedRequest;
};

/** The binding a workflow should end up with: bound to `accountId`, or unbound without one. */
export interface WorkflowBindingTarget {
  workflowId: string;
  accountId?: string;
}

/**
 * The outcome of one workflow's binding change. `written` is the binding the change left, or
 * `null` after an unbind, and `changed` is false for an unbind that found no binding. A failure
 * with `mayHaveApplied` set is a server error, which can still have reached the binding store.
 */
export type WorkflowBindingChangeOutcome =
  | { ok: true; written: ServiceAccountWorkloadBinding | null; changed: boolean }
  | { ok: false; error: string; mayHaveApplied: boolean };

/** A binding change to undo because its workflow write failed. `undefined` when it is unknown. */
export interface WorkflowBindingToReconcile {
  workflowId: string;
  written?: ServiceAccountWorkloadBinding | null;
}

/**
 * Applies binding changes for many workflows of one space in bulk, before their workflow writes.
 * Rejects, having changed nothing, when the request may not change bindings at all. Otherwise
 * resolves an outcome per workflow, and one workflow's failure leaves the others applied.
 */
export const applyWorkflowBindingChanges = async ({
  bindings,
  core,
  getSpaceId,
  spaceId,
  request,
  targets,
}: {
  bindings: Bindings;
  core: CoreStart;
  getSpaceId: (request: KibanaRequest) => string;
  spaceId: string;
  request?: KibanaRequest;
  targets: readonly WorkflowBindingTarget[];
}): Promise<Map<string, WorkflowBindingChangeOutcome>> => {
  const outcomes = new Map<string, WorkflowBindingChangeOutcome>();
  if (targets.length === 0) return outcomes;
  const authenticatedRequest = await ensureBindingChangeAllowed({
    bindings,
    core,
    getSpaceId,
    spaceId,
    request,
  });
  for (const batch of chunk(targets, SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX)) {
    const results = await bindings.bulkUpdateWorkloadBindings(
      authenticatedRequest,
      batch.map(toBindingChange)
    );
    for (const result of results) {
      if (!result.ok) {
        const { statusCode, message } = result.error;
        outcomes.set(result.workloadId, {
          ok: false,
          error: message,
          mayHaveApplied: statusCode >= 500,
        });
      } else {
        outcomes.set(
          result.workloadId,
          result.op === 'bind'
            ? { ok: true, written: result.binding, changed: true }
            : { ok: true, written: null, changed: result.removed }
        );
      }
    }
  }
  return outcomes;
};

const toBindingChange = ({
  workflowId,
  accountId,
}: WorkflowBindingTarget): ServiceAccountWorkloadBindingChange =>
  accountId
    ? { op: 'bind', workloadType: 'workflow', workloadId: workflowId, serviceAccountId: accountId }
    : { op: 'unbind', workloadType: 'workflow', workloadId: workflowId };

/**
 * Undoes binding changes whose workflow writes failed, the way {@link withWorkflowBindingChange}
 * compensates one: each binding is reconciled to the persisted workflow revision, and a binding
 * changed concurrently since it was written is left alone. Resolves the workflows that could not
 * be reconciled.
 */
export const reconcileWorkflowBindings = async ({
  bindings,
  logger,
  spaceId,
  request,
  workflows,
  getWorkflowRevision,
}: {
  bindings: Bindings;
  logger: Logger;
  spaceId: string;
  request: KibanaRequest;
  workflows: readonly WorkflowBindingToReconcile[];
  getWorkflowRevision: (workflowId: string) => Promise<WorkflowRevision>;
}): Promise<Set<string>> => {
  const unreconciled = new Set<string>();
  const targets = await pMap(
    workflows,
    async ({ workflowId, written }): Promise<WorkflowBindingTarget | undefined> => {
      try {
        const current = await bindings.getWorkloadBinding({
          workloadType: 'workflow',
          workloadId: workflowId,
          spaceId,
        });
        // Both reads are best effort: workflow storage and bindings have no shared CAS.
        if (written !== undefined && !isEqual(current, written)) {
          logger.error(
            `Binding compensation skipped after a concurrent change to workflow ${workflowId}.`
          );
          return undefined;
        }
        const targetAccountId = (await getWorkflowRevision(workflowId))?.accountId;
        if (targetAccountId === current?.serviceAccountId) return undefined;
        if (!targetAccountId && !current) return undefined;
        return { workflowId, accountId: targetAccountId };
      } catch (error) {
        logger.error(
          `Binding compensation failed for workflow ${workflowId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
        unreconciled.add(workflowId);
        return undefined;
      }
    },
    { concurrency: RECONCILE_READ_CONCURRENCY }
  );
  const changes = targets.filter((target): target is WorkflowBindingTarget => !!target);
  for (const batch of chunk(changes, SERVICE_ACCOUNT_WORKLOAD_BINDING_CHANGES_MAX)) {
    let failures: Array<{ workflowId: string; message: string }>;
    try {
      const results = await bindings.bulkUpdateWorkloadBindings(
        request,
        batch.map(toBindingChange)
      );
      failures = results.flatMap((result) =>
        result.ok ? [] : [{ workflowId: result.workloadId, message: result.error.message }]
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures = batch.map(({ workflowId }) => ({ workflowId, message }));
    }
    for (const { workflowId, message } of failures) {
      logger.error(`Binding compensation failed for workflow ${workflowId}: ${message}`);
      unreconciled.add(workflowId);
    }
  }
  return unreconciled;
};

export const withWorkflowBindingChange = async <T>({
  bindings,
  core,
  logger,
  workflowId,
  spaceId,
  request,
  previousAccountId,
  accountId,
  write,
  getWorkflowRevision,
  getSpaceId,
}: {
  bindings: Bindings;
  getSpaceId: (request: KibanaRequest) => string;
  core: CoreStart;
  logger: Logger;
  workflowId: string;
  spaceId: string;
  request?: KibanaRequest;
  previousAccountId?: string;
  accountId?: string;
  write: () => Promise<T>;
  getWorkflowRevision: () => Promise<{
    seqNo: number;
    primaryTerm: number;
    accountId?: string;
  } | null>;
}): Promise<T> => {
  if (!previousAccountId && !accountId) return write();
  const authenticatedRequest = await ensureBindingChangeAllowed({
    bindings,
    core,
    getSpaceId,
    spaceId,
    request,
  });
  const coordinates = { workloadType: 'workflow', workloadId: workflowId, spaceId };
  const previous = await bindings.getWorkloadBinding(coordinates);
  const changed = accountId !== previous?.serviceAccountId;
  let written = previous;
  if (changed) {
    if (accountId) {
      written = await bindings.bindWorkload(authenticatedRequest, {
        workloadType: 'workflow',
        workloadId: workflowId,
        serviceAccountId: accountId,
      });
    } else {
      await bindings.unbindWorkload(authenticatedRequest, {
        workloadType: 'workflow',
        workloadId: workflowId,
      });
      written = null;
    }
  }
  try {
    return await write();
  } catch (error) {
    if (changed) {
      try {
        const current = await bindings.getWorkloadBinding(coordinates);
        const currentRevision = await getWorkflowRevision();
        // Both reads are best effort: workflow storage and bindings have no shared CAS.
        if (isEqual(current, written)) {
          const targetAccountId = currentRevision?.accountId;
          // Reconcile to the persisted winner, not the losing operation's original binding.
          if (targetAccountId && targetAccountId !== current?.serviceAccountId) {
            await bindings.bindWorkload(authenticatedRequest, {
              workloadType: 'workflow',
              workloadId: workflowId,
              serviceAccountId: targetAccountId,
            });
          } else if (!targetAccountId && current) {
            await bindings.unbindWorkload(authenticatedRequest, {
              workloadType: 'workflow',
              workloadId: workflowId,
            });
          }
        } else {
          logger.error(
            `Binding compensation skipped after a concurrent change to workflow ${workflowId}.`
          );
        }
      } catch (compensationError) {
        logger.error(
          `Binding compensation failed for workflow ${workflowId}: ${
            compensationError instanceof Error
              ? compensationError.message
              : String(compensationError)
          }`
        );
        throw Boom.internal(BINDING_COMPENSATION_FAILED_MESSAGE);
      }
    }
    throw error;
  }
};

/** Authorizes an owning-plugin definition upgrade that leaves the existing delegation unchanged. */
export const ensureManagedWorkflowUpgradePreservesBinding = async ({
  bindings,
  workflowId,
  document,
  previous,
  options,
}: {
  bindings: Bindings;
  workflowId: string;
  document: WorkflowProperties;
  previous: WorkflowProperties | null;
  options: IndexWorkflowDocumentOptions;
}): Promise<void> => {
  const upgrade = options.managedWorkflowUpgrade;
  const accountId = previous?.definition?.settings?.run_as;
  if (
    !upgrade ||
    options.request ||
    options.create ||
    options.ifSeqNo == null ||
    options.ifPrimaryTerm == null ||
    !accountId ||
    accountId !== document.definition?.settings?.run_as ||
    !previous?.managed ||
    !document.managed ||
    previous.deleted_at ||
    document.deleted_at ||
    previous.managedBy !== upgrade.pluginId ||
    document.managedBy !== upgrade.pluginId ||
    previous.originManagedWorkflowId !== upgrade.definitionId ||
    document.originManagedWorkflowId !== upgrade.definitionId ||
    previous.spaceId !== document.spaceId ||
    !isEqual(previous.managedTemplateValues ?? null, document.managedTemplateValues ?? null)
  ) {
    throw Boom.forbidden(
      'Automatic managed workflow upgrades must preserve the installed owner, template values, and service account identity.'
    );
  }
  if (!bindings.isEnabled()) throw Boom.forbidden('Service account execution is disabled.');
  const binding = await bindings.getWorkloadBinding({
    workloadType: 'workflow',
    workloadId: workflowId,
    spaceId: document.spaceId,
  });
  if (binding?.serviceAccountId !== accountId) {
    throw Boom.forbidden('The managed workflow service account binding is missing or has changed.');
  }
};

const isObservedManagedOrphan = (
  document: WorkflowProperties | null | undefined,
  orphan: ManagedWorkflowOrphan,
  spaceId: string
): document is WorkflowProperties =>
  !!document?.managed &&
  document.spaceId === spaceId &&
  (document.managedBy ?? null) === orphan.managedBy &&
  (document.originManagedWorkflowId ?? null) === orphan.definitionId;

/** Authorizes the orphan sweep to delete a workflow it observed, without a user request. */
export const ensureManagedOrphanUnchanged = ({
  document,
  orphan,
  spaceId,
}: {
  document: WorkflowProperties | null;
  orphan: ManagedWorkflowOrphan;
  spaceId: string;
}): WorkflowProperties => {
  if (!isObservedManagedOrphan(document, orphan, spaceId)) {
    throw Boom.forbidden(
      'Managed orphan cleanup may only delete the managed workflow the sweep observed.'
    );
  }
  return document;
};

/** Authorizes the orphan sweep to disable a workflow it observed, leaving its identity unchanged. */
export const ensureManagedOrphanDisablePreservesBinding = ({
  document,
  previous,
  options,
}: {
  document: WorkflowProperties;
  previous: WorkflowProperties | null;
  options: IndexWorkflowDocumentOptions;
}): void => {
  const orphan = options.managedOrphanDisable;
  if (
    !orphan ||
    options.request ||
    options.create ||
    options.ifSeqNo == null ||
    options.ifPrimaryTerm == null ||
    !isObservedManagedOrphan(previous, orphan, document.spaceId) ||
    !isEqual(document, applyWorkflowVersion(mutateWorkflowToDisabled(previous), previous))
  ) {
    throw Boom.forbidden(
      'The managed workflow may only be switched off, and must still be the one that was observed.'
    );
  }
};
