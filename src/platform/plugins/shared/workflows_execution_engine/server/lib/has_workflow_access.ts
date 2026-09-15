/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, KibanaRequest } from '@kbn/core/server';
import { getWorkflowPermissions } from '@kbn/workflows';
import type { WorkflowAccessSubject } from '@kbn/workflows';

export const hasWorkflowAccess = async (
  workflow: WorkflowAccessSubject,
  request: KibanaRequest,
  core: Pick<CoreStart, 'userProfile'>,
  operation: 'execute' | 'edit' = 'execute'
): Promise<boolean> => {
  const profileId =
    workflow.access_control?.access_mode === 'private'
      ? (await core.userProfile.getCurrentProfileId({ request })) ?? undefined
      : undefined;
  return getWorkflowPermissions(workflow, profileId)[operation];
};
