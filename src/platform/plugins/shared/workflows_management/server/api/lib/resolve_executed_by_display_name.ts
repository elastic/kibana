/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreStart, Logger } from '@kbn/core/server';

interface ResolveExecutedByDisplayNamesParams {
  userProfile: CoreStart['userProfile'];
  executedBy: Array<string | undefined>;
  logger: Logger;
}

/**
 * Resolves display names (by profile uid) using the server-side profile service,
 * so callers do not need the `bulkGetUserProfiles` privilege.
 */
export const resolveExecutedByDisplayNames = async ({
  userProfile,
  executedBy,
  logger,
}: ResolveExecutedByDisplayNamesParams): Promise<Map<string, string>> => {
  const names = new Map<string, string>();
  const uids = new Set(executedBy.flatMap((value) => value?.trim() || []));
  if (uids.size === 0) {
    return names;
  }
  try {
    const profiles = await userProfile.bulkGet({ uids });
    for (const profile of profiles) {
      const name = profile.user?.full_name || profile.user?.username;
      if (name) {
        names.set(profile.uid, name);
      }
    }
  } catch (error) {
    logger.debug(`Failed to resolve display names for execution users: ${error}`);
  }
  return names;
};

export const resolveExecutedByDisplayName = async ({
  userProfile,
  executedBy,
  logger,
}: {
  userProfile: CoreStart['userProfile'];
  executedBy?: string;
  logger: Logger;
}): Promise<string | undefined> => {
  const names = await resolveExecutedByDisplayNames({
    userProfile,
    executedBy: [executedBy],
    logger,
  });
  return executedBy ? names.get(executedBy.trim()) : undefined;
};

/**
 * Adds `executedByDisplayName` to each execution whose profile could be resolved, and returns the
 * names of `additionalExecutedBy` (e.g. active filter values) that may not appear in `results`.
 */
export const withExecutedByDisplayNames = async <T extends { executedBy?: string }>({
  userProfile,
  results,
  additionalExecutedBy = [],
  logger,
}: {
  userProfile: CoreStart['userProfile'];
  results: T[];
  additionalExecutedBy?: string[];
  logger: Logger;
}): Promise<{
  results: Array<T & { executedByDisplayName?: string }>;
  executedByDisplayNames: Record<string, string>;
}> => {
  const names = await resolveExecutedByDisplayNames({
    userProfile,
    executedBy: [...results.map((result) => result.executedBy), ...additionalExecutedBy],
    logger,
  });
  return {
    results: results.map((result) => {
      const name = result.executedBy ? names.get(result.executedBy.trim()) : undefined;
      return name ? { ...result, executedByDisplayName: name } : result;
    }),
    executedByDisplayNames: Object.fromEntries(names),
  };
};
