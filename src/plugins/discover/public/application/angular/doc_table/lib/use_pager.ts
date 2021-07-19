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
  startItem: number;
  endItem: number;
  hasNextPage: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(min, val), max);
}

export const PAGE_SIZE = 50;

export const usePager = ({ totalItems }: { totalItems: number }) => {
  const [meta, setMeta] = useState<MetaParams>({
    currentPage: 0,
    totalItems,
    startIndex: 0,
    totalPages: Math.ceil(totalItems / PAGE_SIZE),
    startItem: 1,
    endItem: PAGE_SIZE,
    hasNextPage: true,
  });

  const getNewMeta = useCallback(
    (updatedCurrentPage?: number) => {
      const actualCurrentPage = updatedCurrentPage ?? meta.currentPage;

      const newTotalPages = Math.ceil(totalItems / PAGE_SIZE);
      const newCurrentPage = clamp(actualCurrentPage, 0, newTotalPages);

      let newStartItem = newCurrentPage * PAGE_SIZE + 1;
      newStartItem = clamp(newStartItem, 0, totalItems);

      let newEndItem = newStartItem - 1 + PAGE_SIZE;
      newEndItem = clamp(newEndItem, 0, totalItems);

      const newStartIndex = newStartItem - 1;

      return {
        currentPage: newCurrentPage,
        totalPages: newTotalPages,
        startIndex: newStartIndex,
        startItem: newStartItem,
        endItem: newEndItem,
        totalItems,
        hasNextPage: meta.currentPage + 1 < meta.totalPages,
      };
    },
    [meta.currentPage, meta.totalPages, totalItems]
  );

  const onPageChange = useCallback((pageIndex: number) => setMeta(getNewMeta(pageIndex)), [
    getNewMeta,
  ]);

  /**
   * Update meta on totalItems change
   */
  useEffect(() => setMeta(getNewMeta()), [getNewMeta, totalItems]);

  return {
    ...meta,
    onPageChange,
  };
};
