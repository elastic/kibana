/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TableVisParams } from '../../types';

export const usePagination = (visParams: TableVisParams, rowCount: number) => {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: visParams.perPage || 0,
  });
  const onChangeItemsPerPage = useCallback(
    (pageSize: number) => setPagination((pag) => ({ ...pag, pageSize, pageIndex: 0 })),
    []
  );
  const onChangePage = useCallback(
    (pageIndex: number) => setPagination((pag) => ({ ...pag, pageIndex })),
    []
  );

  useEffect(() => {
    const pageSize = visParams.perPage || 0;
    const lastPageIndex = Math.ceil(rowCount / pageSize) - 1;
    /**
     * When the underlying data changes, there might be a case when actual pagination page
     * doesn't exist anymore - if the number of rows has decreased.
     * Set the last page as an actual.
     */
    setPagination((pag) => ({
      pageIndex: pag.pageIndex > lastPageIndex ? lastPageIndex : pag.pageIndex,
      pageSize,
    }));
  }, [visParams.perPage, rowCount]);

  const paginationMemoized = useMemo(
    () =>
      pagination.pageSize
        ? {
            ...pagination,
            onChangeItemsPerPage,
            onChangePage,
          }
        : undefined,
    [onChangeItemsPerPage, onChangePage, pagination]
  );

  return paginationMemoized;
};
