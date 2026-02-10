/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isAllowlisted, type Allowlist } from '../allowlist/load_allowlist';

export interface BreakingChange {
  type: 'path_removed' | 'method_removed' | 'operation_breaking';
  path: string;
  method?: string;
  reason: string;
  details?: unknown;
}

export interface FilterResult {
  breakingChanges: BreakingChange[];
  allowlistedChanges: BreakingChange[];
}

export const applyAllowlist = (
  allBreakingChanges: BreakingChange[],
  allowlist: Allowlist
): FilterResult => {
  const breakingChanges: BreakingChange[] = [];
  const allowlistedChanges: BreakingChange[] = [];

  for (const change of allBreakingChanges) {
    const method = change.method ?? 'ALL';
    if (isAllowlisted(allowlist, change.path, method)) {
      allowlistedChanges.push(change);
    } else {
      breakingChanges.push(change);
    }
  }

  return { breakingChanges, allowlistedChanges };
};
