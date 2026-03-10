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
 * Hook that returns a stable callback for toggling a user in the content list
 * filter, or `null` when created-by filtering is not supported.
 *
 * Dispatches {@link CONTENT_LIST_ACTIONS.TOGGLE_USER_FILTER} which:
 * - Checks whether `uid` is present in `filters.user.uid` to decide add vs remove.
 * - Adds/removes the `queryValue` (email) in the `createdBy:()` query clause.
 * - Does **not** mutate `filters.user` directly — the renderer re-derives it.
 *
 * @param uid - The user UID (or sentinel value like `MANAGED_USER_FILTER`).
 * @param queryValue - The display value for the query bar (typically the user's
 *   email, or `'managed'`/`'none'` for sentinel values).
 *
 * @example
 * ```tsx
 * const toggleUser = useUserFilterToggle();
 * if (toggleUser) {
 *   <button onClick={() => toggleUser('u_jane', 'jane@elastic.co')}>
 *     <UserAvatarTip uid="u_jane" />
 *   </button>
 * }
 * ```
 */
export const useUserFilterToggle = (): ((uid: string, queryValue: string) => void) | null => {
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

  if (!supports.createdBy) {
    return null;
  }

  return toggle;
};
