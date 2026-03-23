/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserActivityActionId } from '@kbn/core-user-activity-server';
import type { UserActivityFiltersType } from './user_activity_config';

/** Supported filter policies and their evaluation logic. */
export const filterPolicies = {
  keep: (x: string, arr: readonly string[]) => arr.includes(x),
  drop: (x: string, arr: readonly string[]) => !arr.includes(x),
} as const;

/** Returns true if the action passes all configured filters. */
export function shouldLog(action: UserActivityActionId, filters: UserActivityFiltersType): boolean {
  for (const { policy, actions } of filters) {
    const predicate = filterPolicies[policy];
    if (!predicate(action, actions)) return false;
  }
  return true;
}
