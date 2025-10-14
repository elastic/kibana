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
import { useCallback, useEffect, useState } from 'react';

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
  const buildPaginatedFields = useCallback(() => {
    const allFields = fields.filter(
      (field) =>
        !field.noData &&
        (dimensions.length === 0 ||
          dimensions.every((sel) => field.dimensions.some((d) => d.name === sel)))
    );

    const filteredFieldsBySearch = allFields.filter((field) =>
      field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredFieldsBySearch.length / pageSize);

    const currentPageFields = filteredFieldsBySearch.slice(
      currentPage * pageSize,
      currentPage * pageSize + pageSize
    );

    return {
      currentPageFields,
      filteredFieldsBySearch,
      totalPages,
    };
  }, [currentPage, dimensions, fields, pageSize, searchTerm]);

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
