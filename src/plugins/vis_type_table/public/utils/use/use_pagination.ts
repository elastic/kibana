/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
