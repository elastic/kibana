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
import { FIELD_VALUE_SEPARATOR } from '../common/constants';
import { useMetricFieldsQuery } from './use_metric_fields_query';

export const usePaginatedFields = ({
  fields: providedFields,
  indices,
  timeRange,
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
  valueFilters,
}: {
  fields: MetricField[];
  indices: string[];
  timeRange: TimeRange | undefined;
  searchTerm: string;
  dimensions: string[];
  pageSize: number;
  currentPage: number;
  valueFilters: string[];
}) => {
  const dimensionsSet = useMemo(() => new Set(dimensions), [dimensions]);
  const searchTermLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

  // Convert valueFilters to KQL query string
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
        values.length > 1 ? `"${field}":(${values.join(' or ')})` : `"${field}":${values[0]}`
      )
      .join(' or ');
  }, [valueFilters]);

  // Only fetch from API when kuery is provided, otherwise use provided fields
  const shouldFetchWithKuery = Boolean(kuery);

  // Always pass params, but API will only be called when kuery is present
  const { data: apiFields = [], isFetching } = useMetricFieldsQuery({
    index: indices.join(','), // TODO: refactor Fields API to accept an array of indices like Dimensions API
    timeRange,
    kuery: shouldFetchWithKuery ? kuery : '', // Empty string disables the query
  });

  // Use API fields if kuery is present, otherwise use provided fields
  const fields = shouldFetchWithKuery ? apiFields : providedFields;

  const buildPaginatedFields = useCallback(() => {
    const filteredFields = fields.filter((field) => {
      if (
        field.noData ||
        (searchTermLower && !field.name.toLowerCase().includes(searchTermLower))
      ) {
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

    const totalPages = Math.ceil(filteredFields.length / pageSize);
    const start = currentPage * pageSize;
    const end = start + pageSize;

    return {
      currentPageFields: filteredFields.slice(start, end),
      filteredFieldsCount: filteredFields.length,
      totalPages,
    };
  }, [fields, dimensionsSet, searchTermLower, pageSize, currentPage]);

  const [paginatedFieldsContext, setPaginatedFieldsContext] =
    useState<ReturnType<typeof buildPaginatedFields>>();

  const updateLensPropsContext = useStableCallback(
    (fn: () => ReturnType<typeof buildPaginatedFields>) => setPaginatedFieldsContext(fn())
  );

  useEffect(() => {
    updateLensPropsContext(buildPaginatedFields);
  }, [buildPaginatedFields, updateLensPropsContext]);

  return { ...paginatedFieldsContext, isFetching };
};
