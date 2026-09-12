/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { CHANGE_POINT_GRID_PAGINATION_DATA_TEST_SUBJ } from '../constants';

interface PaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (pageIndex: number) => void;
}

export const Pagination = ({ totalPages, currentPage, onPageChange }: PaginationProps) => {
  useEffect(() => {
    if (totalPages > 0 && currentPage >= totalPages) {
      onPageChange(totalPages - 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <EuiFlexGroup justifyContent="center">
      <EuiFlexItem grow={false}>
        <EuiPagination
          data-test-subj={CHANGE_POINT_GRID_PAGINATION_DATA_TEST_SUBJ}
          aria-label={i18n.translate('changePointChartViewer.pagination.ariaLabel', {
            defaultMessage: 'Change point charts pagination',
          })}
          pageCount={totalPages}
          activePage={currentPage}
          onPageClick={onPageChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
