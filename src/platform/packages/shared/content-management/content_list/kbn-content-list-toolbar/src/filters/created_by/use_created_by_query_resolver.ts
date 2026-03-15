/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { Query } from '@elastic/eui';
import { useContentListUserFilter, type UserFilter } from '@kbn/content-list-provider';
import { useUserProfilesServices } from '@kbn/content-management-user-profiles';

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
 * Returns resolved UIDs and any values that could not be resolved.
 * Sentinels (`managed`, `none`) resolve via the same map (seeded in
 * `buildLookupMaps`).
 */
export const resolveToUids = (
  values: string[],
  emailToUid: Map<string, string>
): { resolved: string[]; unresolved: string[] } => {
  const resolved = new Set<string>();
  const unresolved: string[] = [];
  for (const value of values) {
    const uid = emailToUid.get(value.toLowerCase());
    if (uid) {
      resolved.add(uid);
    } else {
      unresolved.push(value);
    }
  }
  return { resolved: Array.from(resolved), unresolved };
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
 * For unresolved values, falls back to `suggestUserProfiles` (when available)
 * to attempt resolution by name/email. Suggest-resolved mappings are stored
 * in a stable `useRef` cache that persists across re-renders (unlike
 * `emailToUid`, which is rebuilt each time facets change).
 *
 * @param query - The current EUI `Query` from `EuiSearchBar`.
 * @param emailToUid - Lowercased email/username/sentinel -> UID map.
 * @param ready - `true` once profiles have been fetched; skips resolution while loading.
 */
export const useCreatedByQueryResolver = (
  query: Query,
  emailToUid: Map<string, string>,
  ready: boolean
): void => {
  const { userFilter, setSelectedUsers } = useContentListUserFilter();
  const { suggestUserProfiles } = useUserProfilesServices();

  const userFilterRef = useRef<UserFilter | undefined>(undefined);
  userFilterRef.current = userFilter;

  // Stable cache for suggest-resolved mappings. Unlike `emailToUid` (which
  // is rebuilt from facets on each render), this persists across re-renders
  // so suggest resolutions are not lost when the facet list refreshes.
  const suggestCacheRef = useRef(new Map<string, string>());

  // Merged view: facet-derived map + suggest cache, recomputed when either changes.
  const mergedEmailToUid = useMemo(() => {
    const merged = new Map(emailToUid);
    for (const [key, value] of suggestCacheRef.current) {
      if (!merged.has(key)) {
        merged.set(key, value);
      }
    }
    return merged;
  }, [emailToUid]);

  const resolveWithSuggest = useCallback(
    async (values: string[]): Promise<string[]> => {
      if (!suggestUserProfiles || values.length === 0) {
        return [];
      }
      const resolvedUids: string[] = [];
      for (const value of values) {
        try {
          // Suggest is a fuzzy search — the first result may not be an exact
          // match for the typed value (e.g., "jane" could match "jane.smith"
          // before "jane@elastic.co"). This is a best-effort heuristic; an
          // exact-match API would be more precise but is not available.
          const profiles = await suggestUserProfiles(value);
          if (profiles.length > 0) {
            const { uid } = profiles[0];
            resolvedUids.push(uid);
            suggestCacheRef.current.set(value.toLowerCase(), uid);
          }
        } catch {
          // Suggest failure is non-fatal.
        }
      }
      return resolvedUids;
    },
    [suggestUserProfiles]
  );

  useEffect(() => {
    if (!ready) {
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      const { includeValues, excludeValues } = extractCreatedByFieldValues(query);
      const { resolved: includeResolved, unresolved: includeUnresolved } = resolveToUids(
        includeValues,
        mergedEmailToUid
      );
      const { resolved: excludeResolved, unresolved: excludeUnresolved } = resolveToUids(
        excludeValues,
        mergedEmailToUid
      );

      const [suggestedInclude, suggestedExclude] = await Promise.all([
        resolveWithSuggest(includeUnresolved),
        resolveWithSuggest(excludeUnresolved),
      ]);

      if (cancelled) {
        return;
      }

      const include = [...includeResolved, ...suggestedInclude];
      const exclude = [...excludeResolved, ...suggestedExclude];

      const next: UserFilter | undefined =
        include.length > 0 || exclude.length > 0 ? { include, exclude } : undefined;

      if (!isUserFilterEqual(userFilterRef.current, next)) {
        setSelectedUsers(next);
      }
    };

    resolve();

    return () => {
      cancelled = true;
    };
  }, [query, mergedEmailToUid, ready, setSelectedUsers, resolveWithSuggest]);
};
