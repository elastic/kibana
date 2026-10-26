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
