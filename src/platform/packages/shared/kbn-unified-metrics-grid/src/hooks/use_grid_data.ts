/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MetricField } from '@kbn/metrics-experience-plugin/common/types';
import { useStableCallback } from '@kbn/unified-histogram';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TimeRange } from '@kbn/es-query';
import { useFilterFieldsQuery } from './use_filter_fields_query';
import { usePagination } from './use_pagination';
import { useValueFilters } from './use_value_filters';
import { FIELD_VALUE_SEPARATOR } from '../common/constants';

export const useGridData = ({
  fields = [],
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
  timeRange,
  valueFilters,
}: {
  fields: MetricField[];
  searchTerm: string;
  dimensions: string[];
  pageSize: number;
  valueFilters: string[];
  currentPage: number;
  timeRange: TimeRange | undefined;
}) => {
  const dimensionsSet = useMemo(() => new Set(dimensions), [dimensions]);
  const searchTermLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

  // Convert valueFilters to KQL query string
  const kuery = useMemo(() => {
    const filtersMap = valueFilters.reduce((acc, filter) => {
      const [field, value] = filter.split(FIELD_VALUE_SEPARATOR);
      const arr = acc.get(field) || [];

      arr.push(`"${value}"`);
      acc.set(field, arr);

      return acc;
    }, new Map<string, string[]>());

    return Array.from(filtersMap.entries())
      .map(([field, values]) =>
        values.length > 1 ? `"${field}":(${values.join(' or ')})` : `"${field}":${values[0]}`
      )
      .join(' or ');
  }, [valueFilters]);

  // Filter by dimensions and search term
  const candidateFields = useMemo(() => {
    return fields.filter((field) => {
      if (field.noData) {
        return false;
      }

      if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
        return false;
      }

      if (dimensionsSet.size > 0) {
        const hasMatchingDimension = field.dimensions.some((d) => dimensionsSet.has(d.name));
        if (!hasMatchingDimension) {
          return false;
        }
      }

      return true;
    });
  }, [fields, searchTermLower, dimensionsSet]);

  // Prepare fields for API query
  const fieldsForQuery = useMemo(() => {
    return candidateFields.map((field) => ({
      name: field.name,
      index: field.index,
    }));
  }, [candidateFields]);

  // API call: Check which fields have data matching the kuery
  const { data: searchFields = [], isFetching: isSearchFieldsFetching } = useFilterFieldsQuery({
    kuery,
    fields: fieldsForQuery,
    timeRange,
  });

  // Filter candidates by API results (fields that have matching data)
  const matchingFieldNames = useMemo(() => {
    return kuery.trim() !== '' && !isSearchFieldsFetching
      ? new Set(searchFields.map((field) => field.name))
      : undefined;
  }, [searchFields, isSearchFieldsFetching, kuery]);

  const filteredFields = useMemo(() => {
    return matchingFieldNames
      ? candidateFields.filter((field) => matchingFieldNames.has(field.name))
      : candidateFields;
  }, [matchingFieldNames, candidateFields]);

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
    };
  }, [currentPageItems, totalCount, totalPages, filters]);

  // State management: wait for API to finish before updating
  const [stableResult, setStableResult] = useState<ReturnType<typeof buildResult>>();

  const updateResult = useStableCallback((fn: () => ReturnType<typeof buildResult>) =>
    setStableResult(fn())
  );

  useEffect(() => {
    // Only update when:
    // 1. No kuery (no request needed), OR
    // 2. Kuery request has finished (!isSearchFieldsFetching)
    const shouldUpdate = kuery.trim() === '' || !isSearchFieldsFetching;

    if (shouldUpdate) {
      updateResult(buildResult);
    }
  }, [buildResult, updateResult, isSearchFieldsFetching, kuery]);

  return stableResult;
};
