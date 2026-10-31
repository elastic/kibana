/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ColumnSizingInfoState, ColumnSizingState } from '@tanstack/react-table';
import { getColumnWidthVar } from '../styles';
import type { DataGridInternalColumn, DataGridProps } from '../types';
import { clamp } from '../utils/grid_navigation';

const INITIAL_COLUMN_SIZING_INFO: ColumnSizingInfoState = {
  startOffset: null,
  startSize: null,
  deltaOffset: null,
  deltaPercentage: null,
  isResizingColumn: false,
  columnSizingStart: [],
};

const clampWidth = <TRow>(
  { minWidth = 0, maxWidth = Infinity }: DataGridInternalColumn<TRow>,
  width: number
) => clamp(width, minWidth, maxWidth);

const resolveInitialWidth = <TRow>(
  { initialWidth }: DataGridInternalColumn<TRow>,
  gridWidth: number
) => (typeof initialWidth === 'function' ? initialWidth(gridWidth) : initialWidth);

interface UseColumnSizingParams<TRow> {
  columns: Array<DataGridInternalColumn<TRow>>;
  gridWidth: number;
  columnWidths: DataGridProps<TRow>['columnWidths'];
  onColumnResize: DataGridProps<TRow>['onColumnResize'];
}

/**
 * Column widths: the initial widths, `columnWidths` (controlled) and the width of a column while the
 * user drags it. `onColumnResize` is called when the drag ends or the column is reset.
 */
export const useColumnSizing = <TRow>({
  columns,
  gridWidth,
  columnWidths,
  onColumnResize,
}: UseColumnSizingParams<TRow>) => {
  // Widths set by dragging a column, until the resize ends and `columnWidths` takes over.
  const [dragSizing, setDragSizing] = useState<ColumnSizingState>({});
  const [columnSizingInfo, setColumnSizingInfo] = useState<ColumnSizingInfoState>(
    INITIAL_COLUMN_SIZING_INFO
  );

  // Columns follow the grid width until the user resizes them.
  const columnSizing = useMemo<ColumnSizingState>(() => {
    const initialSizing: ColumnSizingState = {};
    columns.forEach((column) => {
      const width = resolveInitialWidth(column, gridWidth);
      if (width !== undefined) {
        initialSizing[column.id] = width;
      }
    });
    return { ...initialSizing, ...columnWidths, ...dragSizing };
  }, [columns, gridWidth, columnWidths, dragSizing]);

  // Report a resize once the user lets go of the handle, not on every pointer move.
  const columnSizingRef = useRef(columnSizing);
  columnSizingRef.current = columnSizing;
  const resizingColumnIdRef = useRef<string>();
  const { isResizingColumn } = columnSizingInfo;
  useEffect(() => {
    if (isResizingColumn) {
      resizingColumnIdRef.current = isResizingColumn;
      return;
    }
    const columnId = resizingColumnIdRef.current;
    if (columnId === undefined) {
      return;
    }
    resizingColumnIdRef.current = undefined;
    // TanStack keeps the dragged size as is and only clamps it when reading it.
    const column = columns.find(({ id }) => id === columnId);
    const width = columnSizingRef.current[columnId];
    onColumnResize?.({ columnId, width: column ? clampWidth(column, width) : width });
    if (columnWidths) {
      // Controlled: from now on the width comes from `columnWidths`.
      setDragSizing({});
    }
  }, [isResizingColumn, onColumnResize, columnWidths, columns]);

  const resetColumnWidth = useCallback(
    (columnId: string) => {
      const column = columns.find(({ id }) => id === columnId);
      if (!column || column.initialWidth === undefined) {
        return;
      }
      // Drop the user's width, the column falls back to its initial width. No width is reported,
      // so a controlled parent drops it too and a function `initialWidth` keeps following the grid.
      setDragSizing(({ [columnId]: _dropped, ...rest }) => rest);
      onColumnResize?.({ columnId, width: undefined });
    },
    [columns, onColumnResize]
  );

  // Fixed width columns follow CSS variables, so resizing doesn't re-render the rows.
  const widthVars = useMemo(() => {
    const vars: Record<string, string> = {};
    columns.forEach((column, columnIndex) => {
      if (column.initialWidth !== undefined) {
        vars[getColumnWidthVar(columnIndex)] = `${clampWidth(column, columnSizing[column.id])}px`;
      }
    });
    // CSS custom properties are not part of React's CSSProperties type.
    return vars as CSSProperties;
  }, [columns, columnSizing]);

  return {
    columnSizing,
    columnSizingInfo,
    setColumnSizing: setDragSizing,
    setColumnSizingInfo,
    resetColumnWidth,
    widthVars,
  };
};
