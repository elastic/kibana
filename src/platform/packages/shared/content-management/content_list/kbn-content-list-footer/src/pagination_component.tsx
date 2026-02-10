/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
import { EuiTablePagination } from '@elastic/eui';

/**
 * Props for the pure {@link PaginationComponent}.
 */
export interface PaginationComponentProps {
  /** Current page index (0-based). */
  pageIndex: number;
  /** Current number of items per page. */
  pageSize: number;
  /** Total number of items matching the current query. */
  totalItems: number;
  /** Available page size options for the dropdown. */
  pageSizeOptions: number[];
  /** Called when the user navigates to a different page. */
  onPageChange: (index: number) => void;
  /** Called when the user changes the items-per-page setting. */
  onPageSizeChange: (size: number) => void;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * Pure presentational pagination component wrapping `EuiTablePagination`.
 *
 * All data is provided via props -- no provider hooks.
 * This component is suitable for unit testing without a provider.
 */
export const PaginationComponent = ({
  pageIndex,
  pageSize,
  totalItems,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  'data-test-subj': dataTestSubj = 'contentListFooter-pagination',
}: PaginationComponentProps) => {
  const pageCount = useMemo(
    () => (pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0),
    [totalItems, pageSize]
  );

  if (totalItems === 0) {
    return null;
  }

  return (
    <EuiTablePagination
      activePage={pageIndex}
      itemsPerPage={pageSize}
      itemsPerPageOptions={pageSizeOptions}
      pageCount={pageCount}
      onChangePage={onPageChange}
      onChangeItemsPerPage={onPageSizeChange}
      data-test-subj={dataTestSubj}
    />
  );
};
