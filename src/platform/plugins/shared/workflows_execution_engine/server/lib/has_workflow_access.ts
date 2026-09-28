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

export const hasWorkflowAccess = async (
  workflow: WorkflowAccessSubject & { id?: string; spaceId?: string },
  request: KibanaRequest,
  core: Pick<CoreStart, 'userProfile' | 'security'>,
  operation: 'execute' | 'edit' = 'execute'
): Promise<boolean> => {
  const profileId =
    workflow.access_control?.access_mode === 'private'
      ? (await core.userProfile.getCurrentProfileId({
          request: getWorkflowOriginalRequest(request),
        })) ?? undefined
      : undefined;
  const allowed = getWorkflowPermissions(workflow, profileId)[operation];
  if (!allowed) {
    logEntityAccessControl(core, getWorkflowOriginalRequest(request), {
      entityType: 'workflow',
      entityId: workflow.id,
      spaceId: workflow.spaceId,
      action: 'denied',
      operation,
    });
  }
  return allowed;
};
