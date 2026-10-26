/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import { isEqual } from 'lodash';
import usePrevious from 'react-use/lib/usePrevious';
import type { Dimension } from '../../../../types';

/**
 * Resets pagination to page 0 whenever the set of selected dimensions
 * changes in any way: adding the first breakdown, clearing the last one,
 * swapping the primary, or adding/removing a secondary. The fetch query
 * filters metrics by ALL selected dimensions, so any change can shift
 * the result set and invalidate the current page.
 *
 * The initial render is implicitly skipped because `usePrevious` returns
 * `undefined` until the effect first runs, which preserves a restored
 * `currentPage` on tab duplication where `useRestorableState` hydrates
 * `selectedDimensions` synchronously in that same first render.
 */
export function useResetPageOnDimensionsChange(
  selectedDimensions: Dimension[],
  onPageChange: (page: number) => void
): void {
  const previousSelectedDimensions = usePrevious(selectedDimensions);

  useEffect(() => {
    if (previousSelectedDimensions === undefined) return;

    if (!isEqual(previousSelectedDimensions, selectedDimensions)) {
      onPageChange(0);
    }
  }, [selectedDimensions, previousSelectedDimensions, onPageChange]);
}
