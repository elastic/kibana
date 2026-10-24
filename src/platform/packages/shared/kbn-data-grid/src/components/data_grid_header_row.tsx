/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { HeaderGroup } from '@tanstack/react-table';
import type { SerializedStyles } from '@emotion/react';
import type { DataGridStyles } from '../styles';
import type { DataGridInternalColumn } from '../types';

interface DataGridHeaderRowProps<TRow> {
  headerGroup: HeaderGroup<TRow>;
  columns: Array<DataGridInternalColumn<TRow>>;
  columnLayouts: SerializedStyles[];
  styles: DataGridStyles;
  /** Column index (1-based) of the grid's tab stop when it is in the header. */
  tabStopColIndex?: number;
  onResetColumnWidth: (columnId: string) => void;
}

export const DataGridHeaderRow = <TRow,>({
  headerGroup,
  columns,
  columnLayouts,
  styles,
  tabStopColIndex,
  onResetColumnWidth,
}: DataGridHeaderRowProps<TRow>) => (
  <div role="row" aria-rowindex={1} css={styles.headerRow}>
    {headerGroup.headers.map((header) => {
      const columnIndex = header.column.getIndex();
      const colIndex = columnIndex + 1;
      return (
        <div
          key={header.id}
          role="columnheader"
          aria-colindex={colIndex}
          tabIndex={colIndex === tabStopColIndex ? 0 : -1}
          data-test-subj={`dataGridHeaderCell-${header.column.id}`}
          data-gridcell-column-id={header.column.id}
          css={[styles.headerCell, columnLayouts[columnIndex]]}
        >
          {columns[columnIndex].header}
          {header.column.getCanResize() && (
            <div
              role="presentation"
              onMouseDown={header.getResizeHandler()}
              onTouchStart={header.getResizeHandler()}
              onDoubleClick={() => onResetColumnWidth(header.column.id)}
              css={[
                styles.resizeHandle,
                header.column.getIsResizing() && styles.resizeHandleActive,
              ]}
            />
          )}
        </div>
      );
    })}
  </div>
);
