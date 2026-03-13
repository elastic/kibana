/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import type { IncludeExcludeFilter, ActiveFilters, UserFilter } from '../datasource';
import { getIncludeExcludeFilter } from '../datasource';
import { CREATED_BY_FIELD_NAME } from '../features/filtering/user_profile/constants';
import type { ContentListClientState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';

/** Returns `undefined` when both arrays are empty, matching the default empty-filter state. */
const normalizeIncludeExclude = (
  include: string[],
  exclude: string[]
): IncludeExcludeFilter | undefined =>
  include.length === 0 && exclude.length === 0 ? undefined : { include, exclude };

/**
 * Default selection state.
 */
export const DEFAULT_SELECTION = {
  selectedIds: [] as string[],
};

/**
 * Collect all `createdBy:` field values from a parsed EUI `Query`, split by
 * include/exclude polarity.
 *
 * Reads simple field clauses (`createdBy:foo`, `-createdBy:bar`) and
 * OR-group clauses (`createdBy:(foo or bar)`) for both polarities.
 */
const collectCreatedByQueryValues = (q: Query): { include: Set<string>; exclude: Set<string> } => {
  const include = new Set<string>();
  const exclude = new Set<string>();

  const simpleClauses = q.ast.getFieldClauses(CREATED_BY_FIELD_NAME);
  if (simpleClauses) {
    for (const clause of simpleClauses) {
      const target = clause.match === 'must' ? include : exclude;
      const vs = Array.isArray(clause.value) ? clause.value : [clause.value];
      vs.forEach((v) => target.add(String(v)));
    }
  }

  const includeOr = q.ast.getOrFieldClause(CREATED_BY_FIELD_NAME, undefined, true, 'eq');
  if (includeOr) {
    const vs = Array.isArray(includeOr.value) ? includeOr.value : [includeOr.value];
    vs.forEach((v) => include.add(String(v)));
  }

  const excludeOr = q.ast.getOrFieldClause(CREATED_BY_FIELD_NAME, undefined, false, 'eq');
  if (excludeOr) {
    const vs = Array.isArray(excludeOr.value) ? excludeOr.value : [excludeOr.value];
    vs.forEach((v) => exclude.add(String(v)));
  }

  return { include, exclude };
};

/**
 * Toggle a user UID's include/exclude state, atomically updating both
 * `filters.user` and the `createdBy:` clause in `search.queryText`.
 *
 * - If `uid` is currently in `include`: remove it from include.
 * - If `uid` is currently in `exclude`: remove it from exclude (without
 *   adding it to include — this resets the UID to the neutral state).
 * - If `uid` is absent from both: add it to `include`.
 *
 * After updating the filter, the `createdBy:` clause in the query text is
 * rebuilt from scratch using canonical `queryValue` strings. This keeps the
 * search bar in sync without requiring a separate dispatch.
 */
const applyToggleUserFilter = (
  state: ContentListClientState,
  { uid, queryValue }: { uid: string; queryValue: string }
): ContentListClientState => {
  const { search, filters } = state;
  const { user: currentUser, ...nonUserFilters } = filters;
  const currentInclude = currentUser?.include ?? [];
  const currentExclude = currentUser?.exclude ?? [];

  const isInInclude = currentInclude.includes(uid);
  const isInExclude = currentExclude.includes(uid);

  let nextInclude: string[];
  let nextExclude: string[];

  if (isInInclude) {
    nextInclude = currentInclude.filter((u) => u !== uid);
    nextExclude = currentExclude;
  } else if (isInExclude) {
    nextInclude = currentInclude;
    nextExclude = currentExclude.filter((u) => u !== uid);
  } else {
    nextInclude = [...currentInclude, uid];
    nextExclude = currentExclude;
  }

  const nextUser: UserFilter | undefined =
    nextInclude.length > 0 || nextExclude.length > 0
      ? { include: nextInclude, exclude: nextExclude }
      : undefined;

  let nextQueryText = search.queryText;
  try {
    const q = nextQueryText ? Query.parse(nextQueryText) : Query.parse('');
    let rebuilt = q
      .removeSimpleFieldClauses(CREATED_BY_FIELD_NAME)
      .removeOrFieldClauses(CREATED_BY_FIELD_NAME);

    const { include: existingInclude, exclude: existingExclude } = collectCreatedByQueryValues(q);

    if (isInInclude) {
      existingInclude.delete(queryValue);
    } else if (isInExclude) {
      existingExclude.delete(queryValue);
    } else {
      existingInclude.add(queryValue);
    }

    for (const v of existingInclude) {
      rebuilt = rebuilt.addOrFieldValue(CREATED_BY_FIELD_NAME, v, true, 'eq');
    }
    for (const v of existingExclude) {
      rebuilt = rebuilt.addOrFieldValue(CREATED_BY_FIELD_NAME, v, false, 'eq');
    }

    nextQueryText = rebuilt.text;
  } catch {
    // Preserve query text on parse failure; filters.user will still be correct.
  }

  return {
    ...state,
    filters: { ...nonUserFilters, user: nextUser },
    search: { queryText: nextQueryText },
    page: { ...state.page, index: 0 },
    selection: { ...DEFAULT_SELECTION },
  };
};

/**
 * State reducer for client-controlled state.
 *
 * Handles user-driven state mutations (search, filters, sort, pagination, selection).
 * Query data (items, loading, error) is managed by React Query directly.
 *
 * Selection is cleared whenever search, filters, sort, or pagination change so that
 * `selectedIds` never references items the user can no longer see.
 *
 * @param state - Current client state.
 * @param action - Action to apply.
 * @returns New client state.
 */
export const reducer = (
  state: ContentListClientState,
  action: ContentListAction
): ContentListClientState => {
  switch (action.type) {
    case CONTENT_LIST_ACTIONS.SET_SEARCH:
      return {
        ...state,
        search: { queryText: action.payload.queryText },
        // `payload.filters` comes from the query parser and never contains `user`
        // (the query bar has no direct access to UIDs). The spread defensively
        // discards any `user` key from `payload.filters` and preserves the live
        // `user` filter so avatar-click toggles and popover selections are not
        // wiped on every search keystroke.
        filters: { ...action.payload.filters, user: state.filters.user },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER:
      return applyToggleUserFilter(state, action.payload);

    case CONTENT_LIST_ACTIONS.SET_USER_FILTER:
      return {
        ...state,
        filters: {
          ...state.filters,
          user: action.payload,
        },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.TOGGLE_FILTER: {
      const { filterId, valueId, valueName, withModifierKey } = action.payload;
      const { filters, search } = state;
      const existingFilter = getIncludeExcludeFilter(filters[filterId]);
      const currentInclude = existingFilter?.include ?? [];
      const currentExclude = existingFilter?.exclude ?? [];

      let nextInclude: string[];
      let nextExclude: string[];

      if (withModifierKey) {
        const isExcluded = currentExclude.includes(valueId);
        nextInclude = currentInclude.filter((id) => id !== valueId);
        nextExclude = isExcluded
          ? currentExclude.filter((id) => id !== valueId)
          : [...currentExclude, valueId];
      } else {
        const isIncluded = currentInclude.includes(valueId);
        nextInclude = isIncluded
          ? currentInclude.filter((id) => id !== valueId)
          : [...currentInclude, valueId];
        nextExclude = currentExclude.filter((id) => id !== valueId);
      }

      const nextFilterValue = normalizeIncludeExclude(nextInclude, nextExclude);
      const { [filterId]: _, ...rest } = filters;
      const nextFilters: ActiveFilters = nextFilterValue
        ? { ...rest, [filterId]: nextFilterValue }
        : rest;

      let nextQueryText = search.queryText;
      try {
        let nextQuery = search.queryText ? Query.parse(search.queryText) : Query.parse('');
        nextQuery = nextQuery.removeOrFieldValue(filterId, valueName);
        if (withModifierKey) {
          if (!currentExclude.includes(valueId)) {
            nextQuery = nextQuery.addOrFieldValue(filterId, valueName, false, 'eq');
          }
        } else {
          if (!currentInclude.includes(valueId)) {
            nextQuery = nextQuery.addOrFieldValue(filterId, valueName, true, 'eq');
          }
        }
        nextQueryText = nextQuery.text;
      } catch {
        // Preserve query text on parse failure; filters will still be correct.
      }

      return {
        ...state,
        filters: nextFilters,
        search: { queryText: nextQueryText },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };
    }

    case CONTENT_LIST_ACTIONS.CLEAR_FILTERS:
      return {
        ...state,
        filters: { ...DEFAULT_FILTERS },
        search: { queryText: '' },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_SORT:
      return {
        ...state,
        sort: {
          field: action.payload.field,
          direction: action.payload.direction,
        },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_INDEX:
      return {
        ...state,
        page: { ...state.page, index: action.payload.index },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_PAGE_SIZE:
      return {
        ...state,
        page: { index: 0, size: action.payload.size },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.SET_SELECTION:
      return {
        ...state,
        selection: {
          selectedIds: action.payload.ids,
        },
      };

    case CONTENT_LIST_ACTIONS.CLEAR_SELECTION:
      return {
        ...state,
        selection: { ...DEFAULT_SELECTION },
      };

    default:
      return state;
  }
};
