/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useMemo } from 'react';
import type { PaginationProps } from '../types';

export const usePagination = ({ pagination, onPaginationChange }: PaginationProps) => {
  const { pageIndex, totalItemCount, pageSize, pageSizeOptions } = pagination;

  const pageCount = useMemo(
    () => (isFinite(totalItemCount / pageSize) ? Math.ceil(totalItemCount / pageSize) : 0),
    [pageSize, totalItemCount]
  );

  const handleItemsPerPageChange = useCallback(
    (nextPageSize: number) => {
      onPaginationChange({
        pagination: {
          pageIndex,
          pageSize: nextPageSize,
          totalItemCount,
        },
      });
    },
    [pageIndex, totalItemCount, onPaginationChange]
  );

  const handlePageIndexChange = useCallback(
    (nextPageIndex: number) => {
      onPaginationChange({
        pagination: {
          pageIndex: nextPageIndex,
          pageSize,
          totalItemCount,
        },
      });
    },
    [pageSize, totalItemCount, onPaginationChange]
  );

  return {
    pageCount,
    pageIndex,
    pageSize,
    pageSizeOptions,

    handleItemsPerPageChange,
    handlePageIndexChange,
  };
};
