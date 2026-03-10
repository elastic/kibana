/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import type { IncludeExcludeFilter, ActiveFilters } from '../datasource';
import { TAG_FILTER_ID } from '../datasource';
import type { ContentListClientState, ContentListAction } from './types';
import { CONTENT_LIST_ACTIONS, DEFAULT_FILTERS } from './types';

/** Returns `undefined` when both arrays are empty, matching the default empty-filter state. */
const normalizeIncludeExclude = (
  include: string[],
  exclude: string[]
): IncludeExcludeFilter | undefined =>
  include.length === 0 && exclude.length === 0 ? undefined : { include, exclude };

/**
 * Read the current {@link IncludeExcludeFilter} for a filter dimension,
 * routing to `filters.tag` for the built-in tag filter and to
 * `filters.custom[filterId]` for plugin-provided dimensions.
 */
const readFilterDimension = (
  filters: ActiveFilters,
  filterId: string
): IncludeExcludeFilter | undefined =>
  filterId === TAG_FILTER_ID ? filters.tag : filters.custom?.[filterId];

/**
 * Write an updated {@link IncludeExcludeFilter} for a filter dimension,
 * routing to `filters.tag` or `filters.custom[filterId]`.
 */
const writeFilterDimension = (
  filters: ActiveFilters,
  filterId: string,
  value: IncludeExcludeFilter | undefined
): ActiveFilters => {
  if (filterId === TAG_FILTER_ID) {
    return { ...filters, tag: value };
  }
  const { [filterId]: _, ...restCustom } = filters.custom ?? {};
  const nextCustom = value ? { ...restCustom, [filterId]: value } : restCustom;
  return {
    ...filters,
    custom: Object.keys(nextCustom).length > 0 ? nextCustom : undefined,
  };
};

/**
 * Default selection state.
 */
export const DEFAULT_SELECTION = {
  selectedIds: [] as string[],
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
        filters: { ...action.payload.filters, user: state.filters.user },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };

    case CONTENT_LIST_ACTIONS.TOGGLE_FILTER: {
      const { filterId, valueId, valueName, withModifierKey } = action.payload;
      const { filters, search } = state;
      const existingFilter = readFilterDimension(filters, filterId);
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
      const nextFilters = writeFilterDimension(filters, filterId, nextFilterValue);

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

    case CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER: {
      const { uid, queryValue } = action.payload;
      const currentUids = state.filters.user?.uid ?? [];
      const isActive = currentUids.includes(uid);

      const nextUid = isActive ? currentUids.filter((u) => u !== uid) : [...currentUids, uid];

      const currentQuery = state.filters.user?.query ?? {};
      const hasActiveUids = nextUid.length > 0 || Object.keys(currentQuery).length > 0;
      const nextUserFilter = hasActiveUids ? { uid: nextUid, query: currentQuery } : undefined;

      let nextQueryText = state.search.queryText;
      try {
        let nextQuery = nextQueryText ? Query.parse(nextQueryText) : Query.parse('');

        const existing = new Set<string>();
        const clauses = nextQuery.ast.getFieldClauses('createdBy');
        if (clauses) {
          for (const clause of clauses) {
            const vs = Array.isArray(clause.value) ? clause.value : [clause.value];
            vs.forEach((v) => existing.add(String(v)));
          }
        }

        nextQuery = nextQuery
          .removeSimpleFieldClauses('createdBy')
          .removeOrFieldClauses('createdBy');

        if (isActive) {
          existing.delete(queryValue);
        } else {
          existing.add(queryValue);
        }

        for (const v of existing) {
          nextQuery = nextQuery.addOrFieldValue('createdBy', v, true, 'eq');
        }

        nextQueryText = nextQuery.text;
      } catch {
        // Preserve query text on parse failure.
      }

      return {
        ...state,
        search: { queryText: nextQueryText },
        filters: { ...state.filters, user: nextUserFilter },
        page: { ...state.page, index: 0 },
        selection: { ...DEFAULT_SELECTION },
      };
    }

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

    case CONTENT_LIST_ACTIONS.SET_FILTERS:
      return {
        ...state,
        filters: action.payload,
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
