/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

interface MetaParams {
  totalPages: number;
  startIndex: number;
  hasNextPage: boolean;
}

export const usePager = ({
  initialPageSize,
  totalItems,
}: {
  totalItems: number;
  initialPageSize: number;
}) => {
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [currentPage, setCurrentPage] = useState(0);

  const meta: MetaParams = useMemo(() => {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      totalPages,
      startIndex: pageSize * currentPage,
      hasNextPage: currentPage + 1 < totalPages,
    };
  }, [currentPage, pageSize, totalItems]);

  const changePage = useCallback((pageIndex: number) => setCurrentPage(pageIndex), []);

  const changePageSize = useCallback((newPageSize: number) => setPageSize(newPageSize), []);

  /**
   * Go to the first page if the current is no longer available
   */
  useEffect(() => {
    if (meta.totalPages < currentPage + 1) {
      changePage(0);
    }
  }, [currentPage, meta.totalPages, changePage]);

  return useMemo(
    () => ({
      ...meta,
      currentPage,
      pageSize,
      changePage,
      changePageSize,
    }),
    [changePage, changePageSize, currentPage, meta, pageSize]
  );
};
