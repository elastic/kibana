/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';

interface MetaParams {
  currentPage: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  hasNextPage: boolean;
  pageSize: number;
}

interface ProvidedMeta {
  updatedPageSize?: number;
  updatedCurrentPage?: number;
}

const INITIAL_PAGE_SIZE = 50;

export const usePager = ({ totalItems }: { totalItems: number }) => {
  const [meta, setMeta] = useState<MetaParams>({
    currentPage: 0,
    totalItems,
    startIndex: 0,
    totalPages: Math.ceil(totalItems / INITIAL_PAGE_SIZE),
    hasNextPage: true,
    pageSize: INITIAL_PAGE_SIZE,
  });

  const getNewMeta = useCallback(
    (newMeta: ProvidedMeta) => {
      const actualCurrentPage = newMeta.updatedCurrentPage ?? meta.currentPage;
      const actualPageSize = newMeta.updatedPageSize ?? meta.pageSize;

      const newTotalPages = Math.ceil(totalItems / actualPageSize);
      const newStartIndex = actualPageSize * actualCurrentPage;

      return {
        currentPage: actualCurrentPage,
        totalPages: newTotalPages,
        startIndex: newStartIndex,
        totalItems,
        hasNextPage: meta.currentPage + 1 < meta.totalPages,
        pageSize: actualPageSize,
      };
    },
    [meta.currentPage, meta.pageSize, meta.totalPages, totalItems]
  );

  const onPageChange = useCallback(
    (pageIndex: number) => setMeta(getNewMeta({ updatedCurrentPage: pageIndex })),
    [getNewMeta]
  );

  const onPageSizeChange = useCallback(
    (newPageSize: number) =>
      setMeta(getNewMeta({ updatedPageSize: newPageSize, updatedCurrentPage: 0 })),
    [getNewMeta]
  );

  /**
   * Update meta on totalItems change
   */
  useEffect(() => setMeta(getNewMeta({})), [getNewMeta, totalItems]);

  return {
    ...meta,
    onPageChange,
    onPageSizeChange,
  };
};
