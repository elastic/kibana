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
  // zero based index, if curPageIndex is set to 1, it will represent the second page.
  const [curPageIndex, setCurPageIndex] = useState(0);

  const meta: MetaParams = useMemo(() => {
    const totalPages = Math.ceil(totalItems / pageSize);
    return {
      totalPages,
      startIndex: pageSize * curPageIndex,
      hasNextPage: curPageIndex + 1 < totalPages,
    };
  }, [curPageIndex, pageSize, totalItems]);

  const changePageIndex = useCallback((pageIndex: number) => setCurPageIndex(pageIndex), []);

  const changePageSize = useCallback((newPageSize: number) => setPageSize(newPageSize), []);

  /**
   * Go to the first page if the current is no longer available
   */
  useEffect(() => {
    if (meta.totalPages < curPageIndex + 1) {
      changePageIndex(0);
    }
  }, [curPageIndex, meta.totalPages, changePageIndex]);

  return useMemo(
    () => ({
      ...meta,
      curPageIndex,
      pageSize,
      changePageIndex,
      changePageSize,
    }),
    [changePageIndex, changePageSize, curPageIndex, meta, pageSize]
  );
};
