/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useRef } from 'react';
import usePrevious from 'react-use/lib/usePrevious';

/**
 * Resets pagination to page 0 when Discover's `breakdownField` changes from
 * one defined value to another after the initial render. Transitions that
 * involve `undefined` (clearing, async settle on mount, or the Discover-internal
 * blip on duplicated tabs) are intentionally ignored to avoid spurious resets.
 */
export function useResetPageOnBreakdownChange(
  breakdownField: string | undefined,
  onPageChange: (page: number) => void
): void {
  const previousBreakdownField = usePrevious(breakdownField);
  const isFirstRenderRef = useRef(true);

  useEffect(() => {
    const hasBreakdownFieldChanged = previousBreakdownField !== breakdownField;

    // Only reset between two defined breakdowns. Transitions through `undefined`
    // (mount settle, clearing, or the Discover blip on duplicated tabs) are
    // intentionally ignored to avoid spurious page resets.
    const shouldResetPage =
      hasBreakdownFieldChanged &&
      previousBreakdownField !== undefined &&
      breakdownField !== undefined &&
      !isFirstRenderRef.current;

    if (shouldResetPage) {
      onPageChange(0);
    }

    isFirstRenderRef.current = false;
  }, [breakdownField, previousBreakdownField, onPageChange]);
}
