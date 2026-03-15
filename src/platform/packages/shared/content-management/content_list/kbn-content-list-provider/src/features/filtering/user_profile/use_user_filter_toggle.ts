/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useContentListConfig } from '../../../context';
import { useContentListState } from '../../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../../state/types';

/**
 * Callback signature for toggling a user in the filter.
 *
 * @param uid - The user's UID (or a sentinel constant).
 * @param queryValue - The display string to write into the query bar
 *   (email for real users, `'managed'`/`'none'` for sentinels).
 */
export type UserFilterToggleFn = (uid: string, queryValue: string) => void;

/**
 * Hook for table cells to toggle a user's filter state via avatar click.
 *
 * Returns a toggle callback when the created-by feature is supported,
 * or `null` when it is not. Callers should guard rendering accordingly.
 *
 * Dispatches `TOGGLE_USER_FILTER`, which atomically updates both
 * `filters.user` and `search.queryText` in the reducer.
 */
export const useUserFilterToggle = (): UserFilterToggleFn | null => {
  const { supports } = useContentListConfig();
  const { dispatch } = useContentListState();

  const toggle = useCallback(
    (uid: string, queryValue: string) => {
      dispatch({
        type: CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER,
        payload: { uid, queryValue },
      });
    },
    [dispatch]
  );

  return supports.createdBy ? toggle : null;
};
