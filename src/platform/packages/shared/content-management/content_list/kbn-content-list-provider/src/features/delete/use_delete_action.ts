/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import type { ContentListItem } from '../../item';
import { useContentListConfig } from '../../context';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';
import type { UseDeleteActionReturn } from './types';

/**
 * Hook that provides delete action capabilities for content list items.
 *
 * Reads the `supports.delete` flag from the provider context and dispatches
 * `REQUEST_DELETE` to open the confirmation modal. Returns a no-op
 * `requestDelete` when delete is not supported.
 *
 * @throws Error if used outside `ContentListProvider`.
 * @returns Object containing `requestDelete`, `isSupported`, and `isDeleting`.
 *
 * @example
 * ```tsx
 * const { requestDelete, isSupported, isDeleting } = useDeleteAction();
 *
 * if (!isSupported) return null;
 *
 * return (
 *   <EuiButtonIcon
 *     iconType="trash"
 *     color="danger"
 *     isLoading={isDeleting}
 *     onClick={() => requestDelete([item])}
 *   />
 * );
 * ```
 */
export const useDeleteAction = (): UseDeleteActionReturn => {
  const { supports } = useContentListConfig();
  const { state, dispatch } = useContentListState();

  const requestDelete = useCallback(
    (items: ContentListItem[]) => {
      if (!supports.delete) {
        return;
      }
      dispatch({ type: CONTENT_LIST_ACTIONS.REQUEST_DELETE, payload: { items } });
    },
    [dispatch, supports.delete]
  );

  return {
    requestDelete,
    isSupported: supports.delete,
    isDeleting: state.isDeleting,
  };
};
