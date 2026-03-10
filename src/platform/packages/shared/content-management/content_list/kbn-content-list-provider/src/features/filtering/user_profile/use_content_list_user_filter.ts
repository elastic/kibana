/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { UserFilter } from '../../../datasource';
import { useContentListConfig } from '../../../context';
import { useContentListState } from '../../../state';
import { CONTENT_LIST_ACTIONS } from '../../../state/types';
import type { UseContentListUserFilterReturn } from './types';

/**
 * Compute the deduplicated union of all UIDs from a {@link UserFilter}.
 *
 * Combines `uid` (email/sentinel-driven from UI controls) with all resolved
 * UIDs from `query` (text-driven from the query bar).
 */
const resolveAllUids = (filter: UserFilter | undefined): string[] => {
  if (!filter) {
    return [];
  }
  const set = new Set([...filter.uid, ...Object.values(filter.query).flat()]);
  return Array.from(set);
};

/**
 * Hook for managing user filter state in the content list.
 *
 * `selectedUsers` is the deduplicated union of all UIDs resolved from
 * `filters.user.uid` (UI-driven) and `filters.user.query` (text-driven).
 * This is used for popover checked state and badge count.
 *
 * Dispatches `SET_USER_FILTER` to update only the `user` portion of
 * `ActiveFilters`, preserving all other filters (search, tags, etc.)
 * at the reducer level.
 *
 * @returns {@link UseContentListUserFilterReturn} with selected users
 *   and helpers for updating them.
 */
export const useContentListUserFilter = (): UseContentListUserFilterReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const selectedUsers = useMemo(() => resolveAllUids(state.filters?.user), [state.filters?.user]);

  const hasActiveFilter = selectedUsers.length > 0;

  const setSelectedUsers = useCallback(
    (userFilter: UserFilter | undefined) => {
      dispatch({
        type: CONTENT_LIST_ACTIONS.SET_USER_FILTER,
        payload: userFilter,
      });
    },
    [dispatch]
  );

  return {
    selectedUsers,
    isSupported: supports.createdBy,
    setSelectedUsers,
    hasActiveFilter,
  };
};
