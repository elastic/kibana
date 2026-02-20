/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { CustomSortingOptions } from '@kbn/content-management-table-list-view-table';

export const getCustomSortingOptions = (): CustomSortingOptions => {
  return {
    field: 'typeTitle',
    sortingLabels: [
      {
        label: i18n.translate('visualizations.listing.table.sortingByTypeColumnNameAsc', {
          defaultMessage: 'Type A-Z',
        }),
        direction: 'asc',
      },
      {
        label: i18n.translate('visualizations.listing.table.sortingByTypeColumnNameDesc', {
          defaultMessage: 'Type Z-A',
        }),
        direction: 'desc',
      },
    ],
  };
};
