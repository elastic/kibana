/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import type { Query } from '@elastic/eui';
import { useContentListUserFilter, type UserFilter } from '@kbn/content-list-provider';

const toArray = (item: unknown): unknown[] => (Array.isArray(item) ? item : [item]);

/** Order-insensitive equality check for string arrays. */
const setsEqual = (a: string[], b: string[]): boolean => {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((v) => set.has(v));
};

const isUserFilterEqual = (a: UserFilter | undefined, b: UserFilter | undefined): boolean => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return setsEqual(a.include, b.include) && setsEqual(a.exclude, b.exclude);
};

/**
 * Resolve an array of query-bar values to UIDs using the `emailToUid` map.
 *
 * Phase 1: exact lookup only — `emailToUid.get(value.toLowerCase())`.
 * Sentinels (`managed`, `none`) resolve via the same map (seeded in
 * `buildLookupMaps`).
 *
 * Phase 2 adds prefix scan and `queryValueToUids` fallback as additional steps.
 */
export const resolveToUids = (values: string[], emailToUid: Map<string, string>): string[] => {
  const seen = new Set<string>();
  for (const value of values) {
    const uid = emailToUid.get(value.toLowerCase());
    if (uid) {
      seen.add(uid);
    }
  }
  return Array.from(seen);
};

/**
 * Extract `createdBy:` field values from the query, split by include/exclude.
 *
 * Handles both OR-clauses (`createdBy:(a or b)`) and simple field clauses
 * (`createdBy:a`), deduplicating within each polarity.
 */
export const extractCreatedByFieldValues = (
  query: Query
): { includeValues: string[]; excludeValues: string[] } => {
  const includeValues: string[] = [];
  const excludeValues: string[] = [];
  const seenInclude = new Set<string>();
  const seenExclude = new Set<string>();

  try {
    const includeOrClause = query.ast.getOrFieldClause('createdBy', undefined, true, 'eq');
    if (includeOrClause) {
      toArray(includeOrClause.value).forEach((v) => {
        const s = String(v);
        if (!seenInclude.has(s)) {
          seenInclude.add(s);
          includeValues.push(s);
        }
      });
    }

    const excludeOrClause = query.ast.getOrFieldClause('createdBy', undefined, false, 'eq');
    if (excludeOrClause) {
      toArray(excludeOrClause.value).forEach((v) => {
        const s = String(v);
        if (!seenExclude.has(s)) {
          seenExclude.add(s);
          excludeValues.push(s);
        }
      });
    }

    const simpleClauses = query.ast.getFieldClauses('createdBy');
    if (simpleClauses) {
      for (const clause of simpleClauses) {
        const isInclude = clause.match === 'must';
        const target = isInclude ? includeValues : excludeValues;
        const seen = isInclude ? seenInclude : seenExclude;
        toArray(clause.value).forEach((v) => {
          const s = String(v);
          if (!seen.has(s)) {
            seen.add(s);
            target.push(s);
          }
        });
      }
    }
  } catch {
    // Parse errors are non-fatal.
  }

  return { includeValues, excludeValues };
};

/**
 * One-way resolver that keeps `filters.user` in sync with the EUI query.
 *
 * Reads `createdBy:` field clauses from the query, maps all values to UIDs
 * via the `emailToUid` map, and dispatches `SET_USER_FILTER` when the
 * resolved filter differs from the current state.
 *
 * The `userFilter` ref is updated on every render (not as a dep) so the
 * effect does not re-run when the filter changes from an external dispatch
 * (e.g. avatar click). It re-runs only when `query` or `emailToUid` changes.
 *
 * @param query - The current EUI `Query` from `EuiSearchBar`.
 * @param emailToUid - Lowercased email/username/sentinel → UID map.
 * @param ready - `true` once profiles have been fetched; skips resolution while loading.
 */
export const useCreatedByQueryResolver = (
  query: Query,
  emailToUid: Map<string, string>,
  ready: boolean
): void => {
  const { userFilter, setSelectedUsers } = useContentListUserFilter();

  const userFilterRef = useRef<UserFilter | undefined>(undefined);
  userFilterRef.current = userFilter;

  useEffect(() => {
    if (!ready) {
      return;
    }

    const { includeValues, excludeValues } = extractCreatedByFieldValues(query);
    const include = resolveToUids(includeValues, emailToUid);
    const exclude = resolveToUids(excludeValues, emailToUid);

    const next: UserFilter | undefined =
      include.length > 0 || exclude.length > 0 ? { include, exclude } : undefined;

    if (!isUserFilterEqual(userFilterRef.current, next)) {
      setSelectedUsers(next);
    }
  }, [query, emailToUid, ready, setSelectedUsers]);
};
