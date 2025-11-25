/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import type { TimeRange } from '@kbn/es-query';
import type {
  MetricField,
  Dimension,
  DimensionFilters,
} from '@kbn/metrics-experience-plugin/common/types';
import { useDimensionFilters } from './use_dimension_filters';
import { useMetricFieldsSearchQuery } from './use_metric_fields_search_query';

export const useFilteredMetricFields = ({
  allFields,
  isFieldsLoading,
  dimensions,
  searchTerm,
  valueFilters,
  timeRange,
  onFilterComplete,
}: {
  allFields: MetricField[];
  isFieldsLoading: boolean;
  dimensions: Dimension[];
  searchTerm: string;
  valueFilters: string[];
  timeRange: TimeRange | undefined;
  onFilterComplete?: () => void;
}) => {
  const { filters: dimensionFilters } = useDimensionFilters(valueFilters);
  const [filteredFields, setFilteredFields] = useState<MetricField[]>(allFields);

  // Client-side filtering by dimensions and search term
  const dimensionFieldNamesSet = useMemo(
    () => (dimensions.length > 0 ? new Set(dimensions.map((d) => d.name)) : new Set<string>()),
    [dimensions]
  );
  const searchTermLower = useMemo(() => searchTerm?.toLowerCase(), [searchTerm]);

  useEffect(() => {
    if (isFieldsLoading) {
      return;
    }

    const hasClientFilters = dimensionFieldNamesSet.size > 0 || searchTermLower?.length > 0;

    if (!hasClientFilters) {
      setFilteredFields(allFields);
      return;
    }

    setFilteredFields(
      allFields.filter((field) => {
        if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
          return false;
        }
        if (dimensionFieldNamesSet.size > 0) {
          return field.dimensions.some((d) => dimensionFieldNamesSet.has(d.name));
        }

        return true;
      })
    );
  }, [isFieldsLoading, allFields, searchTermLower, dimensionFieldNamesSet]);

  const { fieldNamesSearch, indicesSearch } = useMemo(() => {
    if (!dimensionFilters || Object.keys(dimensionFilters).length === 0) {
      return { fieldNamesSearch: new Set<string>(), indicesSearch: new Set<string>() };
    }

    return filteredFields.reduce(
      (acc, field) => {
        acc.fieldNamesSearch.add(field.name);
        acc.indicesSearch.add(field.index);
        return acc;
      },
      { fieldNamesSearch: new Set<string>(), indicesSearch: new Set<string>() }
    );
  }, [filteredFields, dimensionFilters]);

  const shouldSearch = fieldNamesSearch.size > 0;

  const { data: searchResult = [], isFetching } = useMetricFieldsSearchQuery({
    fields: Array.from(fieldNamesSearch),
    index: Array.from(indicesSearch).join(','),
    timeRange,
    filters: dimensionFilters,
    enabled: shouldSearch,
  });

  const lastValueRef = useRef<{
    fields: MetricField[];
    filters?: DimensionFilters;
  }>({ fields: filteredFields, filters: dimensionFilters });

  const shouldUpdate = useMemo(
    () => (shouldSearch && !isFetching) || !shouldSearch,
    [shouldSearch, isFetching]
  );

  if (shouldUpdate) {
    lastValueRef.current = {
      fields: shouldSearch && !isFetching ? searchResult : filteredFields,
      filters: dimensionFilters,
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
