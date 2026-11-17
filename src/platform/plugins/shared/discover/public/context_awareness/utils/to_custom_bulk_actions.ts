/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { UnifiedDataTableProps } from '@kbn/unified-data-table';
import type { BulkActionSelection, DiscoverBulkAction } from '../types';

type CustomBulkActions = NonNullable<UnifiedDataTableProps['customBulkActions']>;

/**
 * Adapts record-based bulk actions to the data table's id-based `customBulkActions`. Selected ids that
 * no longer match a row are dropped, and the selection order is kept.
 */
export const toCustomBulkActions = (
  bulkActions: DiscoverBulkAction[],
  rows: DataTableRecord[]
): CustomBulkActions => {
  const getSelection = ({ selectedDocIds }: { selectedDocIds: string[] }): BulkActionSelection => {
    const rowsById = new Map(rows.map((row) => [row.id, row]));

    return {
      selectedDocs: selectedDocIds.flatMap((id) => {
        const row = rowsById.get(id);
        return row ? [row] : [];
      }),
    };
  };

  return bulkActions.map(({ onClick, isAvailable, getDisabledReason, ...action }) => ({
    ...action,
    onClick: (payload) => onClick(getSelection(payload)),
    ...(isAvailable ? { isAvailable: (payload) => isAvailable(getSelection(payload)) } : {}),
    ...(getDisabledReason
      ? { getDisabledReason: (payload) => getDisabledReason(getSelection(payload)) }
      : {}),
  }));
};
