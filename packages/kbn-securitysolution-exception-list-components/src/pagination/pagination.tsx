/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { FC } from 'react';
import { EuiTablePagination } from '@elastic/eui';

import type { PaginationProps } from '../types';
import { usePagination } from './use_pagination';

const PaginationComponent: FC<PaginationProps> = ({
  dataTestSubj,
  ariaLabel,
  pagination,
  onPaginationChange,
}) => {
  const {
    pageIndex,
    pageCount,
    pageSize,
    pageSizeOptions,

    handleItemsPerPageChange,
    handlePageIndexChange,
  } = usePagination({ pagination, onPaginationChange });

  return (
    <EuiTablePagination
      data-test-subj={dataTestSubj}
      aria-label={ariaLabel}
      pageCount={pageCount}
      activePage={pageIndex}
      itemsPerPage={pageSize}
      onChangePage={handlePageIndexChange}
      onChangeItemsPerPage={handleItemsPerPageChange}
      itemsPerPageOptions={pageSizeOptions}
    />
  );
};

PaginationComponent.displayName = 'PaginationComponent';

export const Pagination = React.memo(PaginationComponent);

Pagination.displayName = 'Pagination';
