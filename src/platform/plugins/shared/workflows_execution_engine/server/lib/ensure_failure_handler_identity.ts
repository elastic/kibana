/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import Boom from '@hapi/boom';
import type { CoreStart } from '@kbn/core/server';
import { getWorkflowPermissions } from '@kbn/workflows';
import type { EsWorkflow, WorkflowExecutionEngineModel } from '@kbn/workflows';
import { WORKFLOW_SERVICE_ACCOUNT_TYPE } from '../service_account_execution';

/** Admits a bound failure subscription without granting the lost caller's private access. */
export const ensureFailureHandlerIdentity = async (
  core: CoreStart,
  workflow: WorkflowExecutionEngineModel,
  current: EsWorkflow | null | undefined,
  spaceId: string
): Promise<void> => {
  const accountId = workflow.definition?.settings?.run_as;
  if (
    !current ||
    !current.enabled ||
    current.deleted_at ||
    workflow.isEphemeral ||
    !getWorkflowPermissions(current, undefined).execute ||
    !accountId ||
    current.definition?.settings?.run_as !== accountId ||
    !core.security.serviceAccounts.isEnabled()
  ) {
    throw Boom.forbidden(
      'An identity-failure handler must be executable without the failed caller and have its own enabled service account binding.'
    );
  }
  const binding = await core.security.serviceAccounts.getWorkloadBinding({
    workloadType: WORKFLOW_SERVICE_ACCOUNT_TYPE,
    workloadId: workflow.id,
    spaceId,
  });
  if (binding?.serviceAccountId !== accountId) {
    throw Boom.forbidden('The failure handler service account binding has changed.');
  }
};
