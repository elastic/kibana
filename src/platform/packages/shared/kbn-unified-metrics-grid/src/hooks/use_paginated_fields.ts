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

export const usePaginatedFields = ({
  fields,
  dimensions,
  pageSize,
  currentPage,
  searchTerm,
}: {
  fields: MetricField[];
  searchTerm: string;
  dimensions: string[];
  pageSize: number;
  currentPage: number;
}) => {
  const dimensionsSet = useMemo(() => new Set(dimensions), [dimensions]);
  const searchTermLower = useMemo(() => searchTerm.toLowerCase(), [searchTerm]);

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

  return paginatedFieldsContext;
};
