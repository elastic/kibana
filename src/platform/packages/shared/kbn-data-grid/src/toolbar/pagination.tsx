/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiTablePagination } from '@elastic/eui';

export interface DataGridPaginationProps {
  pageIndex: number;
  pageSize: number;
  pageSizeOptions?: number[];
  rowCount: number;
  /** Id of the element the pagination controls. */
  ariaControls?: string;
  onChangePage: (pageIndex: number) => void;
  onChangePageSize?: (pageSize: number) => void;
}

export const DataGridPagination = ({
  pageIndex,
  pageSize,
  pageSizeOptions = [],
  rowCount,
  ariaControls,
  onChangePage,
  onChangePageSize,
}: DataGridPaginationProps) => (
  <div data-test-subj="dataGridPagination">
    <EuiTablePagination
      aria-controls={ariaControls}
      pageCount={Math.max(Math.ceil(rowCount / pageSize), 1)}
      activePage={pageIndex}
      onChangePage={onChangePage}
      itemsPerPage={pageSize}
      itemsPerPageOptions={pageSizeOptions}
      onChangeItemsPerPage={onChangePageSize}
    />
  </div>
);
