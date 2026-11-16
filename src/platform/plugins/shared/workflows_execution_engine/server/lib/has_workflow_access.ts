/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { logEntityAccessControl } from '@kbn/entity-access-control';
import { getWorkflowPermissions } from '@kbn/workflows';
import type { WorkflowAccessSubject } from '@kbn/workflows';
import { getWorkflowOriginalRequest } from '../service_account_execution';

interface WorkflowAccessContext {
  core: Pick<CoreStart, 'security'>;
  request: KibanaRequest;
  id: string;
  spaceId: string;
}

export const checkWorkflowAccess = (
  workflow: WorkflowAccessSubject,
  profileId: string | undefined,
  { core, request, id, spaceId }: WorkflowAccessContext,
  operation: 'execute' | 'edit' = 'execute'
): boolean => {
  const allowed = getWorkflowPermissions(workflow, profileId)[operation];
  if (!allowed) {
    logEntityAccessControl(core, request, {
      entityType: 'workflow',
      entityId: id,
      spaceId,
      action: 'denied',
      operation,
    });
  }
  return allowed;
};

export const hasWorkflowAccess = async (
  workflow: WorkflowAccessSubject,
  request: KibanaRequest,
  core: Pick<CoreStart, 'userProfile' | 'security'>,
  {
    id,
    spaceId,
    operation = 'execute',
  }: {
    id: string;
    spaceId: string;
    operation?: 'execute' | 'edit';
  }
): Promise<boolean> => {
  const originalRequest = getWorkflowOriginalRequest(request);
  const profileId =
    workflow.access_control?.access_mode === 'private'
      ? (await core.userProfile.getCurrentProfileId({ request: originalRequest })) ?? undefined
      : undefined;
  return checkWorkflowAccess(
    workflow,
    profileId,
    {
      core,
      request: originalRequest,
      id,
      spaceId,
    },
    operation
  );
};
