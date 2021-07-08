/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useCallback, useEffect, useState } from 'react';

interface PagerProps {
  totalItems: number;
  pageSize: number;
  startingPage: number;
}

interface MetaParams {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  totalPages: number;
  startIndex: number;
  startItem: number;
  endItem: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(Math.max(min, val), max);
}

export const usePager = ({ startingPage, totalItems, pageSize }: PagerProps) => {
  const [meta, setMeta] = useState<MetaParams>({
    currentPage: startingPage,
    totalItems,
    pageSize,
    totalPages: Math.ceil(totalItems / pageSize),
    startItem: 1,
    endItem: pageSize,
    startIndex: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const getNewMeta = useCallback(
    (updatedCurrentPage?: number) => {
      const actualCurrentPage = updatedCurrentPage || meta.currentPage;

      const newTotalPages = Math.ceil(totalItems / pageSize);
      const newCurrentPage = clamp(actualCurrentPage, 1, newTotalPages);

      let newStartItem = (newCurrentPage - 1) * pageSize + 1;
      newStartItem = clamp(newStartItem, 0, totalItems);

      let newEndItem = newStartItem - 1 + pageSize;
      newEndItem = clamp(newEndItem, 0, totalItems);

      const newStartIndex = newStartItem - 1;

      return {
        currentPage: newCurrentPage,
        totalPages: newTotalPages,
        startIndex: newStartIndex,
        startItem: newStartItem,
        endItem: newEndItem,
        totalItems,
        pageSize,
        hasNextPage: meta.currentPage < meta.totalPages,
        hasPreviousPage: meta.currentPage > 1,
      };
    },
    [meta.currentPage, meta.totalPages, pageSize, totalItems]
  );

  const onPageNext = useCallback(() => setMeta(getNewMeta(meta.currentPage + 1)), [
    getNewMeta,
    meta.currentPage,
  ]);

  const onPagePrevious = useCallback(() => setMeta(getNewMeta(meta.currentPage + 1)), [
    getNewMeta,
    meta.currentPage,
  ]);

  /**
   * Update meta on totalItems change
   */
  useEffect(() => setMeta(getNewMeta()), [getNewMeta, totalItems]);

  return {
    ...meta,
    onPageNext,
    onPagePrevious,
  };
};
