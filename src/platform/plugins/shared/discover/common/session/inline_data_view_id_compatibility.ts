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

export interface InlineDataViewIdCompatibilityOptions {
  /** Every inline definition visible during this load. */
  views: ReadonlyArray<InlineDataViewIdentity | undefined>;
}

export interface InlineDataViewIdCompatibility {
  /** Translates references not owned by a view; IDs that refer to more than one spec are left out. */
  shared: DataViewIdMap;
  /** Translates references owned by a view, whose own previous ID always refers to its spec. */
  forView: (identity: InlineDataViewIdentity | undefined) => DataViewIdMap;
}

const createSharedIdMap = (
  identities: ReadonlyArray<InlineDataViewIdentity | undefined>
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

const withEntry = (idMap: DataViewIdMap, [previousId, id]: [string, string]): DataViewIdMap =>
  new Map([...idMap, [previousId, id]]);

/** Resolves which derived ID each previous inline ID refers to, for every consumer of a load. */
export const createInlineDataViewIdCompatibility = ({
  views,
}: InlineDataViewIdCompatibilityOptions): InlineDataViewIdCompatibility => {
  const shared = createSharedIdMap(views);

  const forView = (identity: InlineDataViewIdentity | undefined): DataViewIdMap => {
    const previousId = identity?.dataView.id;
    if (!identity || previousId === undefined || previousId === identity.id) {
      return shared;
    }

    return withEntry(shared, [previousId, identity.id]);
  };

  return { shared, forView };
};
