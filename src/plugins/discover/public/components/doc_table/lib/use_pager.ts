/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useMemo, useState } from 'react';

interface MetaParams {
  totalPages: number;
  startIndex: number;
  hasNextPage: boolean;
}

const INITIAL_PAGE_SIZE = 50;

export const usePager = ({ totalItems }: { totalItems: number }) => {
  const [pageSize, setPageSize] = useState(INITIAL_PAGE_SIZE);
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

  return {
    ...meta,
    currentPage,
    pageSize,
    changePage,
    changePageSize,
  };
};
