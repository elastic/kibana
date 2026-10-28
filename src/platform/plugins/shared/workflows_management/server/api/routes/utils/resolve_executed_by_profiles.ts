/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import type { WorkflowsService } from '../../workflows_management_service';

type ExecutionWithExecutor = Pick<WorkflowExecutionDto, 'executedBy' | 'executedByProfile'>;

/**
 * Attaches the profile of each execution's `executedBy` as `executedByProfile`. The lookup runs as
 * the internal user, so readers do not need `bulkGetUserProfiles`; only executors of executions
 * the caller was already allowed to read are resolved. Values that are not profile uids (for
 * example usernames) stay unresolved. A failed lookup leaves the executions unchanged.
 */
export const resolveExecutedByProfiles = async <T extends ExecutionWithExecutor>(
  { workflowsService, logger }: { workflowsService: WorkflowsService; logger: Logger },
  executions: T[]
): Promise<T[]> => {
  const uids = new Set(executions.flatMap(({ executedBy }) => (executedBy ? [executedBy] : [])));
  if (uids.size === 0) {
    return executions;
  }

  try {
    const { userProfile } = await workflowsService.getCoreStart();
    const profiles = await userProfile.bulkGet({
      uids,
      dataPath: 'avatar',
    });
    const profilesByUid = new Map(profiles.map((profile) => [profile.uid, profile]));
    return executions.map((execution) => {
      const executedByProfile = execution.executedBy
        ? profilesByUid.get(execution.executedBy)
        : undefined;
      return executedByProfile ? { ...execution, executedByProfile } : execution;
    });
  } catch (error) {
    logger.debug(`Failed to resolve execution executor profiles: ${error.message}`);
    return executions;
  }
};
