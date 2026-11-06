/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import { isEqual } from 'lodash';
import useUpdateEffect from 'react-use/lib/useUpdateEffect';
import type { Dimension, MetricsSort, UnifiedMetricsGridProps } from '../../../../types';

const EMPTY_RECENT_METRICS: readonly string[] = [];

export function useRecentlyExploredMetrics({
  getRecentlyExploredMetrics,
  discoverFetch$,
  metricsSort,
  searchTerm,
  selectedDimensions,
}: {
  getRecentlyExploredMetrics?: () => readonly string[];
  discoverFetch$?: UnifiedMetricsGridProps['fetch$'];
  metricsSort: MetricsSort;
  searchTerm: string;
  selectedDimensions: Dimension[];
}): readonly string[] {
  const [recentlyExploredMetrics, setRecentlyExploredMetrics] = useState<readonly string[]>(
    () => getRecentlyExploredMetrics?.() ?? EMPTY_RECENT_METRICS
  );

  const refreshRecentlyExploredMetrics = useCallback(() => {
    setRecentlyExploredMetrics((prev) => {
      const next = getRecentlyExploredMetrics?.() ?? EMPTY_RECENT_METRICS;
      // Prevent re-rendering if the list hasn't changed (i.e. ESQL auto-refresh).
      return isEqual(prev, next) ? prev : next;
    });
  }, [getRecentlyExploredMetrics]);

  // Grid triggers: sort, search and dimensions changes.
  useUpdateEffect(refreshRecentlyExploredMetrics, [
    refreshRecentlyExploredMetrics,
    metricsSort,
    searchTerm,
    selectedDimensions,
  ]);

  // Discover triggers: ES|QL query executed and time range changes.
  useEffect(() => {
    const subscription = discoverFetch$?.subscribe(refreshRecentlyExploredMetrics);
    return () => subscription?.unsubscribe();
  }, [discoverFetch$, refreshRecentlyExploredMetrics]);

  return recentlyExploredMetrics;
}
