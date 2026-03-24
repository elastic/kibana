/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { TAG_FILTER_ID } from '../../datasource';
import { useContentListState } from '../../state/use_content_list_state';
import { CONTENT_LIST_ACTIONS } from '../../state/types';

/**
 * Hook that returns a stable callback for toggling a tag in the content list filters.
 *
 * - Regular call: toggles the tag as an **include** filter.
 * - `withModifierKey: true`: toggles the tag as an **exclude** filter.
 *
 * When a tag is added to include it is removed from exclude (and vice versa).
 * Dispatches `TOGGLE_FILTER`; the reducer handles all EUI `Query` manipulation
 * and atomically updates `filters` and `search.queryText`.
 *
 * @example
 * ```tsx
 * const toggleTag = useTagFilterToggle();
 * <TagBadge tag={tag} onClick={(t, mod) => toggleTag(t.id!, t.name, mod)} />
 * ```
 */
export const useTagFilterToggle = () => {
  const { dispatch } = useContentListState();

  return useCallback(
    (tagId: string, tagName: string, withModifierKey: boolean) => {
      dispatch({
        type: CONTENT_LIST_ACTIONS.TOGGLE_FILTER,
        payload: { filterId: TAG_FILTER_ID, valueId: tagId, valueName: tagName, withModifierKey },
      });
    },
    [dispatch]
  );
};
