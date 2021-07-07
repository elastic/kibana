/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useState } from 'react';

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
    startItem: 0,
    endItem: pageSize,
    startIndex: 0,
  });

  const updateMeta = ({
    currentPage: updatedCurrentPage,
    totalItems: updatedTotalItems,
    pageSize: updatedPageSize,
  }: Partial<MetaParams>) => {
    const actualCurrentPage = updatedCurrentPage || meta.currentPage;
    const actualTotalItems = updatedTotalItems || totalItems;
    const actualPageSize = updatedPageSize || pageSize;

    const newTotalPages = meta.totalPages || Math.ceil(actualTotalItems / pageSize);
    const newCurrentPage = clamp(actualCurrentPage, 1, newTotalPages);

    let newStartItem = (newCurrentPage - 1) * pageSize + 1;
    newStartItem = clamp(newStartItem, 0, actualTotalItems);

    let newEndItem = newStartItem - 1 + pageSize;
    newEndItem = clamp(newEndItem, 0, actualTotalItems);

    const newStartIndex = newStartItem - 1;

    setMeta({
      currentPage: newCurrentPage,
      totalPages: newTotalPages,
      startIndex: newStartIndex,
      startItem: newStartItem,
      endItem: newEndItem,
      totalItems: actualTotalItems,
      pageSize: actualPageSize,
    });
  };

  return {
    ...meta,
    pageCount: Math.ceil(totalItems / pageSize),
    hasNextPage: meta.currentPage < meta.totalPages,
    hasPreviousPage: meta.currentPage > 1,
    updateMeta,
  };
};
