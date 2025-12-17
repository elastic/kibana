/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';

export const usePagination = <TItem>({
  items,
  pageSize,
  currentPage,
}: {
  items: TItem[];
  pageSize: number;
  currentPage: number;
}) => {
  return useMemo(() => {
    const totalPages = Math.ceil(items.length / pageSize);
    const start = currentPage * pageSize;
    const end = start + pageSize;

    return {
      currentPageItems: items.slice(start, end),
      totalPages,
      totalCount: items.length,
    };
  }, [items, pageSize, currentPage]);
};
