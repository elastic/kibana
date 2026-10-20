/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { InlineDataViewIdentity } from './inline_data_view';

export type DataViewIdMap = ReadonlyMap<string, string>;

// Load-time compatibility for stored IDs, separate from deriving identity and binding API filters.
// The caller supplies visible definitions; no aliases are retained beyond this load.

/** Maps previous inline IDs to derived IDs, leaving out IDs that refer to more than one spec. */
export const createInlineDataViewIdMap = (
  identities: Array<InlineDataViewIdentity | undefined>
): DataViewIdMap => {
  const targetIdsById = new Map<string, Set<string>>();
  for (const identity of identities) {
    const previousId = identity?.dataView.id;
    if (!identity || previousId === undefined) {
      continue;
    }

    const targetIds = targetIdsById.get(previousId) ?? new Set<string>();
    targetIds.add(identity.id);
    targetIdsById.set(previousId, targetIds);
  }

  const dataViewIdMap = new Map<string, string>();
  for (const [previousId, targetIds] of targetIdsById) {
    const [targetId] = targetIds;
    if (targetIds.size === 1 && targetId !== previousId) {
      dataViewIdMap.set(previousId, targetId);
    }
  }

  return dataViewIdMap;
};

/** Adds the previous ID of a representation, which always refers to its own spec. */
export const withOwnInlineDataViewId = (
  identity: InlineDataViewIdentity | undefined,
  dataViewIdMap: DataViewIdMap
): DataViewIdMap => {
  const previousId = identity?.dataView.id;
  if (!identity || previousId === undefined || previousId === identity.id) {
    return dataViewIdMap;
  }

  return new Map([...dataViewIdMap, [previousId, identity.id]]);
};
