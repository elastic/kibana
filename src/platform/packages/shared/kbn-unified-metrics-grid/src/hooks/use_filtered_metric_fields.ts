/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef, useEffect } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type { MetricField, DimensionFilters } from '@kbn/metrics-experience-plugin/common/types';
import { useDimensionFilters } from './use_dimension_filters';
import { useMetricFieldsSearchQuery } from './use_metric_fields_search_query';

export const useFilteredMetricFields = ({
  allFields,
  dimensions,
  searchTerm,
  valueFilters,
  timeRange,
  onFilterComplete,
}: {
  allFields: MetricField[];
  dimensions: string[];
  searchTerm: string;
  valueFilters: string[];
  timeRange: TimeRange | undefined;
  onFilterComplete?: () => void;
}) => {
  const { filters } = useDimensionFilters(valueFilters);

  // Client-side filtering by dimensions and search term
  const dimensionsSet = useMemo(
    () => (dimensions.length > 0 ? new Set(dimensions) : null),
    [dimensions]
  );
  const searchTermLower = useMemo(() => searchTerm?.toLowerCase(), [searchTerm]);

  const filteredFields = useMemo(() => {
    return allFields.filter((field) => {
      if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
        return false;
      }

      if (dimensionsSet && dimensionsSet.size > 0) {
        const hasMatchingDimension = field.dimensions.some((d) => dimensionsSet.has(d.name));
        if (!hasMatchingDimension) {
          return false;
        }
      }

      return true;
    });
  }, [allFields, searchTermLower, dimensionsSet]);

  const { fiedNamesSearch, indicesSearch } = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return { fiedNamesSearch: new Set<string>(), indicesSearch: new Set<string>() };
    }

    return filteredFields.reduce(
      (acc, field) => {
        acc.fiedNamesSearch.add(field.name);
        acc.indicesSearch.add(field.index);
        return acc;
      },
      { fiedNamesSearch: new Set<string>(), indicesSearch: new Set<string>() }
    );
  }, [filteredFields, filters]);

  const shouldSearch = fiedNamesSearch.size > 0;

  const { data: fieldsFilteredByValue = [], isFetching } = useMetricFieldsSearchQuery({
    fields: Array.from(fiedNamesSearch),
    index: Array.from(indicesSearch).join(','),
    timeRange,
    filters,
    enabled: shouldSearch,
  });

  const lastValueRef = useRef<{
    fields: MetricField[];
    filters?: DimensionFilters;
  }>({ fields: filteredFields, filters });

  const shouldUpdate = useMemo(
    () => (shouldSearch && !isFetching) || !shouldSearch,
    [shouldSearch, isFetching]
  );

  if (shouldUpdate) {
    lastValueRef.current = {
      fields: shouldSearch && !isFetching ? fieldsFilteredByValue : filteredFields,
      filters,
    };
  }

  useEffect(() => {
    if (shouldUpdate) {
      onFilterComplete?.();
    }
  }, [shouldUpdate, onFilterComplete]);

  return {
    ...lastValueRef.current,
    isLoading: shouldSearch && isFetching,
  };
};
