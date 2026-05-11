/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const MAX_RENAME_HOPS = 256;

/**
 * Follows ES|QL column renames from a result column name toward underlying field names.
 *
 * Tuples in `renamedColumnsPairs` are **`[newName, oldName]`** as produced by
 * `getQuerySummary().renamedColumnsPairs` (e.g. RENAME, STATS BY aliases when encoded as pairs).
 * Multiple pairs are composed: each step maps the current name to the previous name
 * until there is no further mapping.
 *
 * @param outputColumnName — Column name as returned by ES|QL (after pipeline renames).
 * @param renamedColumnsPairs — From `getQuerySummary(query).renamedColumnsPairs`, or omit / empty set when absent.
 */
export function resolveRenamedSourceField(
  outputColumnName: string,
  renamedColumnsPairs?: Iterable<[string, string]>
): string {
  if (renamedColumnsPairs == null) {
    return outputColumnName;
  }

  const renameLookup = new Map<string, string>(renamedColumnsPairs);
  if (renameLookup.size === 0) {
    return outputColumnName;
  }

  let name = outputColumnName;
  const visited = new Set<string>();

  for (let hop = 0; hop < MAX_RENAME_HOPS; hop++) {
    if (visited.has(name)) {
      return name;
    }
    const previousName = renameLookup.get(name);
    if (previousName === undefined) {
      return name;
    }
    visited.add(name);
    name = previousName;
  }

  return name;
}
