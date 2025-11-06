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
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useGridData = ({
  indexPattern,
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
  timeRange,
  valueFilters,
  allFields,
}: {
  allFields: MetricField[];
  indexPattern: string;
  searchTerm: string;
  dimensions: string[];
  pageSize: number;
  valueFilters: string[];
  currentPage: number;
  timeRange: TimeRange | undefined;
}) => {
  // Build kuery from valueFilters
  const kuery = useMemo(() => {
    if (valueFilters.length === 0) return undefined;

    const filtersMap = valueFilters.reduce((acc, filter) => {
      const [field, value] = filter.split(FIELD_VALUE_SEPARATOR);
      const arr = acc.get(field) || [];
      arr.push(`"${value}"`);
      acc.set(field, arr);
      return acc;
    }, new Map<string, string[]>());

    return Array.from(filtersMap.entries())
      .map(([field, values]) =>
        values.length > 1 ? `${field}:(${values.join(' or ')})` : `${field}:${values[0]}`
      )
      .join(' and ');
  }, [valueFilters]);

  // STEP 2: Calculate candidate fields based on dimensions + search term
  // This gives us the shortlist of fields we want to check against kuery
  const candidateFields = useFilteredFields({
    fields: allFields,
    dimensions,
    searchTerm,
  });

  const candidateFieldNames = useMemo(
    () => candidateFields.map((field) => field.name),
    [candidateFields]
  );

  // STEP 3: When value filters exist, perform optimized search with field list
  // PERFORMANCE: Only checks the candidate fields (e.g., 50) instead of all fields (e.g., 1000+)
  const { data: searchedFields = [], isFetching: isFetchingSearch } = useMetricFieldsSearchQuery({
    fields: candidateFieldNames,
    index: indexPattern,
    timeRange,
    kuery: kuery || '', // Safe since we control enabled
    enabled: !!kuery && candidateFieldNames.length > 0,
  });

  // Use searched fields when kuery is active, otherwise use all fields
  const fields = kuery ? searchedFields : allFields;
  const isFieldsLoading = kuery ? isFetchingSearch : false;

  // Filter by dimensions and search term (client-side for display)
  const filteredDimensions = useMemo(() => (kuery ? [] : dimensions), [kuery, dimensions]);
  const filteredFields = useFilteredFields({
    fields,
    dimensions: filteredDimensions,
    searchTerm,
  });

  // Paginate the filtered results
  const { currentPageItems, totalPages, totalCount } = usePagination({
    items: filteredFields,
    pageSize,
    currentPage,
  });

  // Transform valueFilters to filters format
  const filters = useValueFilters(valueFilters);

  // Build the result
  const buildResult = useCallback(() => {
    return {
      currentPageFields: currentPageItems,
      filteredFieldsCount: totalCount,
      totalPages,
      filters,
      isFieldsLoading,
      allFields, // Always the full field list for toolbar (never changes based on value filters)
    };
  }, [currentPageItems, totalCount, totalPages, filters, isFieldsLoading, allFields]);

  // State management
  const [stableResult, setStableResult] = useState<ReturnType<typeof buildResult>>();

  const updateResult = useStableCallback((fn: () => ReturnType<typeof buildResult>) =>
    setStableResult(fn())
  );

  useEffect(() => {
    // Only update when:
    // 1. No kuery (no request needed), OR
    // 2. Kuery request has finished (!isSearchFieldsFetching)
    const shouldUpdate = kuery?.trim() === '' || !isFetchingSearch;

    if (shouldUpdate) {
      updateResult(buildResult);
    }
  }, [buildResult, updateResult, isFetchingSearch, kuery]);

  return stableResult;
};
