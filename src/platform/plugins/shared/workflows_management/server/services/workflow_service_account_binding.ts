/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import isEqual from 'lodash/isEqual';
import type { CoreStart, KibanaRequest, Logger } from '@kbn/core/server';
import { GLOBAL_WORKFLOW_SPACE_ID } from '@kbn/workflows/server';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';

import type { IndexWorkflowDocumentOptions } from './workflow_occ_types';
import type { WorkflowProperties } from '../storage/workflow_storage';

type Bindings = WorkflowsExecutionEnginePluginStart['serviceAccountBindings'];

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
        throw Boom.internal(
          'Workflow write and service account binding compensation failed. Reconcile the workflow binding before retrying.'
        );
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
