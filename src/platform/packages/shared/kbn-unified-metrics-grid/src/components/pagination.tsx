/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface PaginationProps {
  totalPages: number;
  currentPage: number;

  loaded: number;
  total: number;

  onPageChange: (pageIndex: number) => void;
}

export const Pagination = ({
  totalPages,
  currentPage,
  loaded,
  total,
  onPageChange,
}: PaginationProps) => {
  if (totalPages <= 1) {
    return null;
  }

  if (currentPage >= totalPages - 1) {
    return null;
  }

  return (
    <EuiButton fullWidth onClick={() => onPageChange(currentPage + 1)}>
      {i18n.translate('metricsExperience.pagination.euiPagination.metricsPaginationLabel', {
        defaultMessage: 'Load more ({loaded}/{total})',
        values: {
          loaded,
          total,
        },
      })}
    </EuiButton>
  );
};
