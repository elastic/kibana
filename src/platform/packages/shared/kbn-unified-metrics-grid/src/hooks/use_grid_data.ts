/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useStableCallback } from '@kbn/unified-histogram';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { usePagination } from './use_pagination';
import { useValueFilters } from './use_value_filters';
import { useFilteredFields } from './use_filtered_fields';
import { useMetricFieldsSearchQuery } from './use_metric_fields_search_query';

export const useGridData = ({
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
  timeRange,
  valueFilters,
  allFields,
}: {
  allFields: MetricField[];
  searchTerm: string;
  dimensions: string[];
  pageSize: number;
  valueFilters: string[];
  currentPage: number;
  timeRange: TimeRange | undefined;
}) => {
  // STEP 1: Build kuery from valueFilters and prepare Lens filters
  const { kuery, filters } = useValueFilters(valueFilters);

  // STEP 2: Calculate filtered fields based on dimensions + search term
  const filteredFields = useFilteredFields({
    fields: allFields,
    dimensions,
    searchTerm,
  });

  const { filteredFieldNames, filteredIndices } = useMemo(() => {
    const uniqueNames = new Set<string>();
    const uniqueIndices = new Set<string>();

    filteredFields.forEach((field) => {
      uniqueNames.add(field.name);
      uniqueIndices.add(field.index);
    });

    return {
      filteredFieldNames: Array.from(uniqueNames),
      filteredIndices: Array.from(uniqueIndices),
    };
  }, [filteredFields]);

  // STEP 3: When value filters exist, perform optimized search with field list
  // PERFORMANCE: Only checks the candidate fields (e.g., 50) instead of all fields (e.g., 1000+)
  const { data: searchedFields = [], isFetching: isFetchingSearch } = useMetricFieldsSearchQuery({
    fields: filteredFieldNames,
    index: filteredIndices.join(','),
    timeRange,
    kuery: kuery || '', // Safe since we control enabled
    enabled: !!kuery && filteredFieldNames.length > 0,
  });

  // STEP 4: Filter out noData searched fields
  const filteredAndSearchedFields = useFilteredFields({ fields: searchedFields });
  const items = kuery ? filteredAndSearchedFields : filteredFields;

  // Paginate the filtered results
  const { currentPageItems, totalPages, totalCount } = usePagination({
    items,
    pageSize,
    currentPage,
  });

  // Build the result
  const buildResult = useCallback(() => {
    return {
      currentPageFields: currentPageItems,
      filteredFieldsCount: totalCount,
      totalPages,
      filters,
      isFieldsLoading: kuery ? isFetchingSearch : false,
    };
  }, [currentPageItems, totalCount, totalPages, filters, isFetchingSearch, kuery]);

  // State management
  const [stableResult, setStableResult] = useState<ReturnType<typeof buildResult>>();

  const updateResult = useStableCallback((fn: () => ReturnType<typeof buildResult>) =>
    setStableResult(fn())
  );

  useEffect(() => {
    updateResult(buildResult);
  }, [buildResult, updateResult]);

  return stableResult;
};
