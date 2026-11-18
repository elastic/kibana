/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import type { ClipboardEvent, KeyboardEvent } from 'react';
import type { SerializedStyles } from '@emotion/react';
import { tabularCopyMarkers } from '@elastic/eui';

import type { DataGridCellAddress, DataGridCommandResult } from './data_grid_api';
import type { DataGridColumn } from './data_grid_column';
import { getDataGridCellTextValue, renderDataGridCell } from './data_grid_column';
import { areDataGridCellAddressesEqual, getDataGridNavigationIntent } from './data_grid_navigation';

interface DataGridCellProps<TRow extends object> {
  readonly address: DataGridCellAddress;
  readonly row: TRow;
  readonly displayIndex: number;
  readonly column: DataGridColumn<TRow>;
  readonly value: unknown;
  readonly columnIndex: number;
  readonly rowIds: readonly string[];
  readonly columnIds: readonly string[];
  readonly activeCell: DataGridCellAddress | null;
  readonly cellStyles: SerializedStyles;
  readonly focusCell: (address: DataGridCellAddress) => Promise<DataGridCommandResult>;
  readonly registerCell: (address: DataGridCellAddress, element: HTMLDivElement | null) => void;
  readonly activateFocusedCell: (address: DataGridCellAddress) => void;
  readonly announceCopySuccess: () => void;
  readonly announceCopyFailure: () => void;
}

const hasExplicitTextSelection = (): boolean => {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
};

export const DataGridCell = <TRow extends object>({
  address,
  row,
  displayIndex,
  column,
  value,
  columnIndex,
  rowIds,
  columnIds,
  activeCell,
  cellStyles,
  focusCell,
  registerCell,
  activateFocusedCell,
  announceCopySuccess,
  announceCopyFailure,
}: DataGridCellProps<TRow>): React.ReactElement => {
  const { rowId, columnId } = address;
  const stableAddress = useMemo(() => ({ rowId, columnId }), [columnId, rowId]);
  const isActive = areDataGridCellAddressesEqual(activeCell, stableAddress);
  const ref = useCallback(
    (element: HTMLDivElement | null) => registerCell(stableAddress, element),
    [registerCell, stableAddress]
  );
  const onFocus = useCallback(
    (event: React.FocusEvent<HTMLDivElement>) => {
      if (event.target === event.currentTarget) {
        activateFocusedCell(stableAddress);
      }
    },
    [activateFocusedCell, stableAddress]
  );

  const cellContext = { row, ...stableAddress, displayIndex };
  const textValue = getDataGridCellTextValue(column, cellContext, value);
  const onCopy = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || hasExplicitTextSelection()) {
        return;
      }

      try {
        event.clipboardData.setData('text/plain', textValue);
        event.preventDefault();
        announceCopySuccess();
      } catch {
        announceCopyFailure();
      }
    },
    [announceCopyFailure, announceCopySuccess, textValue]
  );
  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        return;
      }

      const navigationIntent = getDataGridNavigationIntent(
        { rowIds, columnIds },
        stableAddress,
        event.key,
        event.ctrlKey || event.metaKey
      );
      if (!navigationIntent.handled) {
        return;
      }

      event.preventDefault();
      if (navigationIntent.target) {
        void focusCell(navigationIntent.target);
      }
    },
    [columnIds, focusCell, rowIds, stableAddress]
  );

  return (
    <div
      ref={ref}
      role="gridcell"
      tabIndex={isActive ? 0 : -1}
      aria-colindex={columnIndex + 1}
      aria-label={textValue}
      css={cellStyles}
      onFocus={onFocus}
      onCopy={onCopy}
      onKeyDown={onKeyDown}
    >
      {renderDataGridCell(column, cellContext, value)}
      {columnIndex === columnIds.length - 1
        ? tabularCopyMarkers.hiddenNewline
        : tabularCopyMarkers.hiddenTab}
    </div>
  );
};
