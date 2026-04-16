/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DependencyList } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { Dimension } from '../../../../types';
import { mergeDimensions } from '../utils/merge_dimensions';

/**
 * Tracks a high-water-mark set of dimensions across multiple METRICS_INFO
 * fetches so that selecting additional breakdown dimensions (which narrows the
 * WHERE filter and can drop dimensions from the response) does not remove
 * previously-available options from the picker.
 *
 * The accumulator is cleared whenever any entry in `resetDeps` changes —
 * those deps describe the data context (query, time range, filters, ES|QL
 * variables) where dropped dimensions represent a legitimate shape change,
 * not a narrowing of the same dataset.
 *
 * The accumulator is held in a ref rather than useState. The caller writes the
 * merged list into its own useAsyncFn return value, which already triggers a
 * render; adding useState here would force a second, redundant render per
 * fetch.
 *
 * @param resetDeps values that, when any changes by `Object.is`, reset the
 *   accumulator to empty
 * @returns a stable `merge` function. Pass `aborted=true` to skip writing the
 *   ref when the owning fetch has been aborted (a newer fetch may have already
 *   reset the ref for a new data context).
 */
export function useAccumulatedDimensions(
  resetDeps: DependencyList
): (incoming: Dimension[], aborted?: boolean) => Dimension[] {
  const accumulatedRef = useRef<Dimension[]>([]);
  const previousDepsRef = useRef<DependencyList>(resetDeps);

  useEffect(() => {
    const previous = previousDepsRef.current;
    const changed =
      previous.length !== resetDeps.length ||
      resetDeps.some((dep, index) => !Object.is(dep, previous[index]));

    if (changed) {
      accumulatedRef.current = [];
      previousDepsRef.current = resetDeps;
    }
  });

  return useCallback((incoming: Dimension[], aborted: boolean = false): Dimension[] => {
    const merged = mergeDimensions(accumulatedRef.current, incoming);
    if (!aborted) {
      accumulatedRef.current = merged;
    }
    return merged;
  }, []);
}
