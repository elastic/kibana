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
 * Detects new removed types by comparing two snapshots and identifying
 * types that exist in 'from' but not in 'to', and are neither already in
 * removed_types.json nor part of the WIP types allowlist.
 *
 * WIP types are excluded because a type that is converted into a WIP type
 * disappears from the current ('to') snapshot. Without this guard, such a
 * type would be wrongly classified as removed and added to removed_types.json,
 * which would then permanently prevent it from being registered again.
 */
export function detectNewRemovedTypes(
  from: MigrationSnapshot,
  to: MigrationSnapshot,
  currentRemovedTypes: string[],
  wipTypes: string[] = []
): string[] {
  const fromTypes = Object.keys(from.typeDefinitions);
  const toTypes = new Set(Object.keys(to.typeDefinitions));
  const ignoredTypes = new Set([...currentRemovedTypes, ...wipTypes]);

  const removedTypes = fromTypes.filter((type) => !toTypes.has(type) && !ignoredTypes.has(type));

  return removedTypes.sort();
}
