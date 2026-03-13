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
import { useContentListState } from '../../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../../state/types';

/**
 * Return type for {@link useContentListUserFilter}.
 */
export interface UseContentListUserFilterReturn {
  /** UIDs currently selected (included) in the user filter. */
  selectedUsers: string[];
  /** The full `UserFilter` from state, or `undefined` when inactive. */
  userFilter: UserFilter | undefined;
  /** Whether the created-by feature is supported (service present + not disabled). */
  isSupported: boolean;
  /** Whether any user filter is currently active. */
  hasActiveFilter: boolean;
  /** Replace the entire `filters.user` value via `SET_USER_FILTER`. */
  setSelectedUsers: (filter: UserFilter | undefined) => void;
}

/**
 * Hook to read and update the user (created-by) filter state.
 *
 * Provides the selected UIDs, the raw filter, and a setter for
 * wholesale replacement (used by the query resolver).
 */
export const useContentListUserFilter = (): UseContentListUserFilterReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const { user: userFilter } = state.filters;
  const selectedUsers = useMemo(() => userFilter?.include ?? [], [userFilter]);

  const setSelectedUsers = useCallback(
    (filter: UserFilter | undefined) => {
      dispatch({ type: CONTENT_LIST_ACTIONS.SET_USER_FILTER, payload: filter });
    },
    [dispatch]
  );

  const hasActiveFilter = selectedUsers.length > 0 || (userFilter?.exclude?.length ?? 0) > 0;

  return {
    selectedUsers,
    userFilter,
    isSupported: supports.createdBy,
    hasActiveFilter,
    setSelectedUsers,
  };
};
