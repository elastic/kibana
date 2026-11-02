/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@kbn/react-query';
import { useContentListConfig } from '../../context';
import { isFilterFacetConfig, type FilterFacet } from '../types';
import { TAG_FILTER_ID, type ActiveFilters } from '../../datasource';
import { useActiveFilters } from '../../query_model';
import { contentListKeys } from '../../query';

/**
 * Exclude a specific filter from the active filters to implement
 * faceted-search semantics (the filter popover shows counts for the
 * full result set, not narrowed by its own selection).
 */
const excludeFilter = (filters: ActiveFilters, filterId: string): ActiveFilters => {
  const { [filterId]: _excluded, ...rest } = filters;
  return rest;
};

/**
 * React Query hook that calls a filter feature's `getFacets` callback.
 *
 * Returns display-ready {@link FilterFacet} arrays for filter popovers.
 * The `T` parameter carries through to the facet `data` field so renderers
 * receive typed payloads without casting.
 *
 * Disabled when the feature is `true` (no config) or `false` — only fires
 * when a {@link FilterFacetConfig} with `getFacets` is provided.
 *
 * Call with `enabled: isPopoverOpen` so it fires lazily on popover open.
 *
 * @param filterId - The filter dimension key (e.g. `'createdBy'`, `'tag'`).
 * @param opts - Options including `enabled` to control when the query fires.
 */
export const useFilterFacets = <T = unknown>(
  filterId: string,
  opts?: { enabled?: boolean }
): UseQueryResult<FilterFacet<T>[]> => {
  const { features, queryKeyScope } = useContentListConfig();

  const activeFilters = useActiveFilters();

  const featureConfigMap: Record<string, typeof features.userProfiles | typeof features.tags> = {
    createdBy: features.userProfiles,
    [TAG_FILTER_ID]: features.tags,
  };
  const featureConfig = featureConfigMap[filterId];
  const getFacets = isFilterFacetConfig(featureConfig) ? featureConfig.getFacets : undefined;

  const facetFilters = useMemo(
    () => excludeFilter(activeFilters, filterId),
    [activeFilters, filterId]
  );

  // The config stores `FilterFacetConfig<unknown>` (type is erased at the
  // `ContentListFeatures` boundary). The generic `T` on this hook restores
  // type safety for callers; the cast below is safe because each caller
  // knows the concrete facet type for its `filterId`.
  return useQuery({
    queryKey: contentListKeys.filterFacets(queryKeyScope, filterId, facetFilters),
    queryFn: ({ signal }) =>
      getFacets!({ filters: facetFilters, signal }) as Promise<FilterFacet<T>[]>,
    enabled: (opts?.enabled ?? true) && !!getFacets,
    keepPreviousData: true,
  });
};
