/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MigrationSnapshot } from '../../types';

/**
 * Detects for new removed types by comparing two snapshots and identifying
 * types that exist in 'from' but not in 'to' and not already in removed_types.json
 */
export function detectRemovedTypes(
  from: MigrationSnapshot,
  to: MigrationSnapshot,
  currentRemovedTypes: string[]
): string[] {
  const fromTypes = Object.keys(from.typeDefinitions);
  const toTypes = Object.keys(to.typeDefinitions);

  const removedTypes: string[] = [];

  for (const type of fromTypes) {
    if (!toTypes.includes(type) && !currentRemovedTypes.includes(type)) {
      removedTypes.push(type);
    }
  }

  return removedTypes.sort();
}
