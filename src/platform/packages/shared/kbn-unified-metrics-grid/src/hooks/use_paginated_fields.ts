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
import type { ValueFilter } from '../types';

export const usePaginatedFields = ({
  fields,
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
  valueFilters,
  noDataMetrics,
}: {
  fields: MetricField[];
  searchTerm: string;
  dimensions: string[];
  valueFilters: Array<ValueFilter>;
  pageSize: number;
  currentPage: number;
  noDataMetrics: string[];
}) => {
  const fieldsWithData = useMemo(() => {
    return fields.filter((field) => !field.noData && !noDataMetrics.includes(field.name));
  }, [fields, noDataMetrics]);
  const dimensionsSet = useMemo(() => new Set(dimensions), [dimensions]);
  const searchTermLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);
  const scopesSet = useMemo(() => {
    if (valueFilters.length === 0) return null;
    const scopes = new Set<string>();
    valueFilters.forEach((v) => {
      v.scopes?.forEach((ds) => scopes.add(ds));
    });
    return scopes;
  }, [valueFilters]);

  const buildPaginatedFields = useCallback(() => {
    const filteredFields = fieldsWithData.filter((field) => {
      if (searchTermLower && !field.name.toLowerCase().includes(searchTermLower)) {
        return false;
      }

      if (scopesSet && (!field.scope || !scopesSet.has(field.scope))) {
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
  }, [fieldsWithData, dimensionsSet, searchTermLower, scopesSet, pageSize, currentPage]);

  const [paginatedFieldsContext, setPaginatedFieldsContext] =
    useState<ReturnType<typeof buildPaginatedFields>>();

  const updateLensPropsContext = useStableCallback(
    (fn: () => ReturnType<typeof buildPaginatedFields>) => setPaginatedFieldsContext(fn())
  );

  useEffect(() => {
    updateLensPropsContext(buildPaginatedFields);
  }, [buildPaginatedFields, updateLensPropsContext]);

  return paginatedFieldsContext;
};
