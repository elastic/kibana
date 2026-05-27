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
 * Resets pagination to page 0 when the set of selected dimensions changes
 * meaningfully. Detects changes to every position in the array (primary
 * and secondary breakdowns alike), since the fetch query filters metrics
 * by ALL selected dimensions. The initial render is implicitly skipped
 * because `usePrevious` returns `undefined` until the effect first runs.
 */
export function useResetPageOnDimensionsChange(
  selectedDimensions: Dimension[],
  onPageChange: (page: number) => void
): void {
  const previousSelectedDimensions = usePrevious(selectedDimensions);

  useEffect(() => {
    if (previousSelectedDimensions === undefined) return;

    const haveDimensionsChanged = !isEqual(previousSelectedDimensions, selectedDimensions);

    const shouldResetPage =
      haveDimensionsChanged &&
      previousSelectedDimensions.length > 0 &&
      selectedDimensions.length > 0;

    if (shouldResetPage) {
      onPageChange(0);
    }
  }, [selectedDimensions, previousSelectedDimensions, onPageChange]);
}
