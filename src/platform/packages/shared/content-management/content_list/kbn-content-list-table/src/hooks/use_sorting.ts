/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useCallback } from 'react';
import type { Criteria } from '@elastic/eui';
import {
  useContentListConfig,
  useContentListSort,
  type ContentListItem,
} from '@kbn/content-list-provider';

/**
 * Hook to handle table sorting configuration and changes.
 *
 * Integrates with {@link useContentListSort} from the provider to manage sort state.
 *
 * @returns Object containing:
 *   - `sorting` - Configuration object for `EuiBasicTable`'s `sorting` prop.
 *   - `onChange` - Handler for `EuiBasicTable`'s `onChange` event to update sort.
 */
export const useSorting = (): {
  sorting?: {
    sort: {
      field: string;
      direction: 'asc' | 'desc';
    };
  };
  onChange: (criteria: Criteria<ContentListItem>) => void;
} => {
  const { supports } = useContentListConfig();
  const { field, direction, setSort } = useContentListSort();
  const supportsSorting = supports.sorting;

  const sorting = useMemo(() => {
    if (!supportsSorting) {
      return undefined;
    }

    return {
      sort: {
        field,
        direction,
      },
    };
  }, [field, direction, supportsSorting]);

  const onChange = useCallback(
    (criteria: Criteria<ContentListItem>) => {
      if (!supportsSorting) {
        return;
      }

      if (criteria.sort) {
        setSort(String(criteria.sort.field), criteria.sort.direction);
      }
    },
    [setSort, supportsSorting]
  );

  return { sorting, onChange };
};
