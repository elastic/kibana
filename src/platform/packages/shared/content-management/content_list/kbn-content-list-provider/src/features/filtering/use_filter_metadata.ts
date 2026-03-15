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
import { useContentListState } from '../../state';
import { isFilterFeatureConfig, type FilterFacet } from '../types';
import { TAG_FILTER_ID, type ActiveFilters } from '../../datasource';
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
 * React Query hook that calls a filter feature's `getMetadata` callback.
 *
 * Returns display-ready {@link FilterFacet} arrays for filter popovers.
 * Disabled when the feature is `true` (no config) or `false` — only fires
 * when a {@link FilterFeatureConfig} with `getMetadata` is provided.
 *
 * Call with `enabled: isPopoverOpen` so it fires lazily on popover open.
 *
 * @param filterId - The filter dimension key (e.g. `'createdBy'`, `'tag'`).
 * @param opts - Options including `enabled` to control when the query fires.
 */
export const useFilterMetadata = (
  filterId: string,
  opts?: { enabled?: boolean }
): UseQueryResult<FilterFacet[]> => {
  const { features, queryKeyScope } = useContentListConfig();
  const {
    state: { filters },
  } = useContentListState();

  const featureConfigMap: Record<string, typeof features.createdBy | typeof features.tags> = {
    createdBy: features.createdBy,
    [TAG_FILTER_ID]: features.tags,
  };
  const featureConfig = featureConfigMap[filterId];
  const getMetadata = isFilterFeatureConfig(featureConfig) ? featureConfig.getMetadata : undefined;

  const facetFilters = useMemo(() => excludeFilter(filters, filterId), [filters, filterId]);

  const queryResult = useQuery({
    queryKey: contentListKeys.filterMetadata(queryKeyScope, filterId, facetFilters),
    queryFn: ({ signal }) => getMetadata!({ filters: facetFilters, signal }),
    enabled: (opts?.enabled ?? true) && !!getMetadata,
    staleTime: 30_000,
  });

  // React Query v4 reports `isLoading: true` for disabled queries that have
  // never fetched (status='loading', fetchStatus='idle'). Override to `false`
  // when `getMetadata` is absent so consumers don't show a spinner forever.
  if (!getMetadata) {
    return { ...queryResult, isLoading: false, isInitialLoading: false } as typeof queryResult;
  }

  return queryResult;
};
