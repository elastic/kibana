/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo, useState } from 'react';
import type { ClipboardEvent, FocusEvent, KeyboardEvent } from 'react';
import type { SerializedStyles } from '@emotion/react';
import { keys, tabularCopyMarkers } from '@elastic/eui';
import { tabbable } from 'tabbable';

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
  readonly announceCellContentEntered: () => void;
  readonly contentEntryHintId: string;
}

const hasExplicitTextSelection = (): boolean => {
  const selection = window.getSelection();
  return Boolean(selection && !selection.isCollapsed && selection.toString().length > 0);
};

// Returns the tab stop after (or before) the one holding the target, wrapping around the cell.
const getWrappedTabStop = (
  tabStops: ReadonlyArray<HTMLElement | SVGElement>,
  target: Node,
  backwards: boolean
): HTMLElement | SVGElement => {
  const ownIndex = tabStops.findIndex((tabStop) => tabStop === target);
  const currentIndex =
    ownIndex >= 0 ? ownIndex : tabStops.findLastIndex((tabStop) => tabStop.contains(target));
  const start = currentIndex >= 0 ? currentIndex : backwards ? 0 : -1;
  const step = backwards ? -1 : 1;
  return tabStops[(start + step + tabStops.length) % tabStops.length];
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
  announceCellContentEntered,
  contentEntryHintId,
}: DataGridCellProps<TRow>): React.ReactElement => {
  const { rowId, columnId } = address;
  const stableAddress = useMemo(() => ({ rowId, columnId }), [columnId, rowId]);
  const isActive = areDataGridCellAddressesEqual(activeCell, stableAddress);
  const ref = useCallback(
    (element: HTMLDivElement | null) => registerCell(stableAddress, element),
    [registerCell, stableAddress]
  );
  const [hasContentTabStops, setHasContentTabStops] = useState(false);
  // Focus on the cell or inside its content, such as a clicked link, makes it the active cell. Focus
  // on the cell itself checks for tab stops, so the cell can describe how to enter its content.
  const onFocus = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      activateFocusedCell(stableAddress);
      if (event.target === event.currentTarget) {
        setHasContentTabStops(tabbable(event.currentTarget).length > 0);
      }
    },
    [activateFocusedCell, stableAddress]
  );

  const cellContext = useMemo(
    () => ({ row, ...stableAddress, displayIndex }),
    [displayIndex, row, stableAddress]
  );

  const onCopy = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget || hasExplicitTextSelection()) {
        return;
      }

      try {
        event.clipboardData.setData(
          'text/plain',
          getDataGridCellTextValue(column, cellContext, value)
        );
        event.preventDefault();
        announceCopySuccess();
      } catch {
        announceCopyFailure();
      }
    },
    [announceCopyFailure, announceCopySuccess, cellContext, column, value]
  );
  // Inside the content, Escape returns to the cell and Tab wraps among the cell's tab stops.
  // Unhandled keys, and Tab in content without tab stops, are left to the grid and browser.
  const onContentKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      const { key, shiftKey, target, currentTarget: cellElement } = event;
      if (event.defaultPrevented || !(target instanceof Node) || !cellElement.contains(target)) {
        return;
      }

      if (key === keys.ESCAPE) {
        event.preventDefault();
        event.stopPropagation();
        void focusCell(stableAddress);
        return;
      }
      if (key !== keys.TAB) {
        return;
      }
      const tabStops = tabbable(cellElement);
      if (tabStops.length === 0) {
        return;
      }
      event.preventDefault();
      getWrappedTabStop(tabStops, target, shiftKey).focus();
    },
    [focusCell, stableAddress]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.target !== event.currentTarget) {
        onContentKeyDown(event);
        return;
      }

      // Enter moves focus into the content, so that a second Enter activates a link natively.
      if (event.key === keys.ENTER) {
        const [firstTabStop] = tabbable(event.currentTarget);
        if (firstTabStop) {
          event.preventDefault();
          firstTabStop.focus();
          announceCellContentEntered();
        }
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
    [announceCellContentEntered, columnIds, focusCell, onContentKeyDown, rowIds, stableAddress]
  );

  return (
    <div
      ref={ref}
      role="gridcell"
      tabIndex={isActive ? 0 : -1}
      aria-colindex={columnIndex + 1}
      aria-describedby={hasContentTabStops ? contentEntryHintId : undefined}
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
