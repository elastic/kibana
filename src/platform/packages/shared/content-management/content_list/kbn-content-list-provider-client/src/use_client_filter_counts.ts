/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useSyncExternalStore } from 'react';
import { useActiveFilters, type ActiveFilters } from '@kbn/content-list-provider';
import { useClientStrategyContext } from './client_strategy_context';
import { filterItems } from './strategy';

const EMPTY_COUNTS: ReadonlyMap<string, number> = new Map();

const excludeOwnFilter = (active: ActiveFilters, filterId: string): ActiveFilters => {
  if (!(filterId in active)) {
    return active;
  }
  const { [filterId]: _own, ...rest } = active;
  return rest;
};

/**
 * Returns a map of option value → item count for the given filter, computed
 * client-side from the current items snapshot with all other active filters
 * applied (faceted counts). Returns an empty map when the filter id is not
 * registered or no items are loaded.
 *
 * Must be called inside a {@link ContentListClientProvider} tree.
 */
export const useClientFilterCounts = (filterId: string): ReadonlyMap<string, number> => {
  const { getItemsSnapshot, subscribe, filters } =
    useClientStrategyContext('useClientFilterCounts');
  const activeFilters = useActiveFilters();
  const filter = filters[filterId];
  const items = useSyncExternalStore(subscribe, getItemsSnapshot, getItemsSnapshot);

  const facetFilters = useMemo(
    () => excludeOwnFilter(activeFilters, filterId),
    [activeFilters, filterId]
  );

  return useMemo(() => {
    if (!filter) {
      return EMPTY_COUNTS;
    }
    const narrowed = filterItems(items, facetFilters, filters);
    const counts = new Map<string, number>();
    for (const item of narrowed) {
      for (const value of filter.normalizeValues(item)) {
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
    }
    return counts;
  }, [facetFilters, filter, filters, items]);
};
