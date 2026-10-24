/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { DATA_GRID_FOOTER_ROW_CLASS } from '../constants';
import type { DataGridStyles } from '../styles';
import type { DataGridProps } from '../types';
import { getLayoutStyle } from './data_grid_cell';
import type { DataGridColumnSlices } from './data_grid_row';
import { ColumnSpacer } from './data_grid_row';

interface DataGridFooterRowProps<TRow> {
  slices: DataGridColumnSlices<TRow>;
  styles: DataGridStyles;
  ariaRowIndex: number;
  renderFooterCell: NonNullable<DataGridProps<TRow>['renderFooterCell']>;
  /** Column index (1-based) of the grid's tab stop when it is in the footer. */
  tabStopColIndex?: number;
}

/** A row below the data that stays in view while the rows scroll, e.g. a summary of each column. */
export const DataGridFooterRow = <TRow,>({
  slices,
  styles,
  ariaRowIndex,
  renderFooterCell,
  tabStopColIndex,
}: DataGridFooterRowProps<TRow>) => {
  const { columns, layouts, leading, middle, trailing, startSpacer, endSpacer, totalWidth } =
    slices;

  const renderCell = (columnIndex: number) => {
    const { id, isControl } = columns[columnIndex];
    const layout = layouts[columnIndex];
    return (
      <div
        key={id}
        role="gridcell"
        aria-colindex={columnIndex + 1}
        tabIndex={columnIndex + 1 === tabStopColIndex ? 0 : -1}
        data-test-subj={`dataGridFooterCell-${id}`}
        data-gridcell-column-id={id}
        data-sticky-side={layout.sticky?.side}
        css={[
          styles.cell,
          layout.sticky && styles.cellSticky,
          layout.sticky?.isEdge && styles.cellStickyEdge,
          isControl && styles.cellNoSelect,
          isControl && styles.cellControl,
        ]}
        style={getLayoutStyle(layout)}
      >
        {renderFooterCell({ columnId: id, colIndex: columnIndex, isControl })}
      </div>
    );
  };

  return (
    <div
      role="row"
      aria-rowindex={ariaRowIndex}
      className={DATA_GRID_FOOTER_ROW_CLASS}
      css={styles.footerRow}
      style={{ inlineSize: totalWidth }}
    >
      {leading.map(renderCell)}
      <ColumnSpacer width={startSpacer} styles={styles} />
      {middle.map(renderCell)}
      <ColumnSpacer width={endSpacer} styles={styles} />
      {trailing.map(renderCell)}
    </div>
  );
};
