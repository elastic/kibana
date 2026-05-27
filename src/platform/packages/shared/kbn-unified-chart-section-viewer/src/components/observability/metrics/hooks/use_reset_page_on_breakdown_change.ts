/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';
import usePrevious from 'react-use/lib/usePrevious';

/**
 * Resets pagination to page 0 when Discover's `breakdownField` changes from
 * one defined value to another. Transitions that involve `undefined` (clearing,
 * async settle on mount, or the Discover-internal blip on duplicated tabs) are
 * intentionally ignored to avoid spurious resets. The first render is implicitly
 * covered because `usePrevious` returns `undefined` until the effect runs.
 */
export function useResetPageOnBreakdownChange(
  breakdownField: string | undefined,
  onPageChange: (page: number) => void
): void {
  const previousBreakdownField = usePrevious(breakdownField);

  useEffect(() => {
    const hasBreakdownFieldChanged = previousBreakdownField !== breakdownField;

    const shouldResetPage =
      hasBreakdownFieldChanged &&
      previousBreakdownField !== undefined &&
      breakdownField !== undefined;

    if (shouldResetPage) {
      onPageChange(0);
    }
  }, [breakdownField, previousBreakdownField, onPageChange]);
}
