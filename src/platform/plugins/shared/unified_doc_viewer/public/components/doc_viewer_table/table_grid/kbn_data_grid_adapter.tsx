/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createDataGridColumnHelper, DataGrid } from '@kbn/discover-data-grid';
import React, { useMemo } from 'react';
import type { TableGridModel } from './model';

export interface KbnDataGridAdapterProps<TRow extends object> {
  model: TableGridModel<TRow>;
}

/**
 * Renders the neutral fields table model with `@kbn/discover-data-grid`.
 *
 * This is the first, intentionally incomplete slice. Cell actions and details, column sizing and
 * density, the leading control column, appearance options, header visibility, and scroll
 * restoration are part of the model but are not rendered yet.
 */
export const KbnDataGridAdapter = <TRow extends object>({
  model,
}: KbnDataGridAdapterProps<TRow>) => {
  const { ariaLabel, columns: modelColumns, getRowId, rows } = model;
  const columns = useMemo(() => {
    const columnHelper = createDataGridColumnHelper<TRow>();

    return modelColumns.map(({ id, label, renderCell, getTextValue }) =>
      columnHelper.accessor({
        id,
        header: label,
        getValue: (row) => row,
        getTextValue: ({ row, rowId, columnId }) => getTextValue({ row, rowId, columnId }),
        renderCell: ({ row, rowId, columnId }) => renderCell({ row, rowId, columnId }),
      })
    );
  }, [modelColumns]);

  return (
    <DataGrid
      ariaLabel={ariaLabel}
      columns={columns}
      rows={rows}
      getRowId={getRowId}
      data-test-subj="UnifiedDocViewerTableGrid"
    />
  );
};
