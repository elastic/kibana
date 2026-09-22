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
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';

type Bindings = WorkflowsExecutionEnginePluginStart['serviceAccountBindings'];

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
}: {
  bindings: Bindings;
  core: CoreStart;
  logger: Logger;
  workflowId: string;
  spaceId: string;
  request?: KibanaRequest;
  previousAccountId?: string;
  accountId?: string;
  write: () => Promise<T>;
  getWorkflowRevision: () => Promise<{ seqNo: number; primaryTerm: number } | null>;
}): Promise<T> => {
  if (!previousAccountId && !accountId) return write();
  if (!bindings.isEnabled()) throw Boom.forbidden('Service account execution is disabled.');
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
  const coordinates = { workloadType: 'workflow', workloadId: workflowId, spaceId };
  const previousRevision = await getWorkflowRevision();
  const previous = await bindings.getWorkloadBinding(coordinates);
  const changed = accountId !== previous?.serviceAccountId;
  let written = previous;
  if (changed) {
    if (accountId) {
      written = await bindings.bindWorkload(request, {
        workloadType: 'workflow',
        workloadId: workflowId,
        serviceAccountId: accountId,
      });
    } else {
      await bindings.unbindWorkload(request, { workloadType: 'workflow', workloadId: workflowId });
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
        if (isEqual(current, written) && isEqual(currentRevision, previousRevision)) {
          if (previous) {
            await bindings.bindWorkload(request, {
              workloadType: 'workflow',
              workloadId: workflowId,
              serviceAccountId: previous.serviceAccountId,
            });
          } else {
            await bindings.unbindWorkload(request, {
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
