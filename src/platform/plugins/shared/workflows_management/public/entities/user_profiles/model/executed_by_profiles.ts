/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName } from '@kbn/user-profile-components';
import type { WorkflowExecutionListItemDto } from '@kbn/workflows';

const USER_PROFILE_UID_PREFIX = 'u_';
/** Same sentinel as `UNKNOWN_EXECUTION_IDENTITY` on the execution document. */
const UNKNOWN_EXECUTED_BY = 'unknown';

/**
 * Label to show when no user profile matches `executedBy`. Serverless hides an unresolved profile
 * UID and the missing-identity sentinel. A service-account id stays visible.
 */
export const executedByFallbackLabel = (
  executedBy: string | undefined,
  showUnresolvedExecutors: boolean
): string | undefined => {
  const value = executedBy?.trim();
  if (!value) {
    return undefined;
  }
  if (showUnresolvedExecutors) {
    return value;
  }
  if (value === UNKNOWN_EXECUTED_BY || value.startsWith(USER_PROFILE_UID_PREFIX)) {
    return undefined;
  }
  return value;
};

export const getExecutedByLabel = (
  profile?: UserProfileWithAvatar,
  fallbackLabel?: string
): string | undefined => {
  if (!profile?.user) return fallbackLabel;

  return getUserDisplayName(profile.user) || fallbackLabel;
};

/** Indexes the profiles the server resolved for each execution's `executedBy`. */
export const getExecutedByProfiles = (
  executions: Array<Pick<WorkflowExecutionListItemDto, 'executedBy' | 'executedByProfile'>>
): Map<string, UserProfileWithAvatar> =>
  executions.reduce<Map<string, UserProfileWithAvatar>>(
    (acc, { executedBy, executedByProfile }) => {
      if (executedBy && executedByProfile) {
        acc.set(executedBy, executedByProfile);
      }
      return acc;
    },
    new Map<string, UserProfileWithAvatar>()
  );
