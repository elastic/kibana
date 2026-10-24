/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isEqual } from 'lodash';
import type { DataGridInternalColumn, DataGridProps } from '../types';
import { clampColumnWidth, getColumnWidths } from '../utils/column_widths';

interface UseColumnSizingParams<TRow> {
  columns: Array<DataGridInternalColumn<TRow>>;
  gridWidth: number;
  columnWidths: DataGridProps<TRow>['columnWidths'];
  onColumnResize: DataGridProps<TRow>['onColumnResize'];
}

const getClientX = (event: MouseEvent | TouchEvent) =>
  'touches' in event ? event.touches[0]?.clientX ?? 0 : event.clientX;

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
  const [dragWidths, setDragWidths] = useState<Record<string, number>>({});
  const [resizingColumnId, setResizingColumnId] = useState<string>();

  const computedWidths = useMemo(
    () =>
      getColumnWidths({
        columns,
        userWidths: { ...columnWidths, ...dragWidths },
        gridWidth,
      }),
    [columns, columnWidths, dragWidths, gridWidth]
  );
  // The consumer often builds its columns again without changing a width. Keep the same array then,
  // so the layout and every visible row do not render again.
  const widthsRef = useRef(computedWidths);
  if (!isEqual(widthsRef.current, computedWidths)) {
    widthsRef.current = computedWidths;
  }
  const widths = widthsRef.current;

  const stopResizeRef = useRef<() => void>();
  useEffect(() => () => stopResizeRef.current?.(), []);

  const startResize = useCallback(
    (columnIndex: number, event: ReactMouseEvent | ReactTouchEvent) => {
      const column = columns[columnIndex];
      if (!column) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      stopResizeRef.current?.();

      const startX = getClientX(event.nativeEvent);
      const startWidth = widthsRef.current[columnIndex];
      let currentWidth = startWidth;
      setResizingColumnId(column.id);

      // Rendering the rows is the expensive part, once per frame is enough.
      let frame: number | undefined;
      const onMove = (moveEvent: MouseEvent | TouchEvent) => {
        currentWidth = clampColumnWidth(column, startWidth + getClientX(moveEvent) - startX);
        if (frame === undefined) {
          frame = requestAnimationFrame(() => {
            frame = undefined;
            setDragWidths((prev) => ({ ...prev, [column.id]: currentWidth }));
          });
        }
      };
      const stop = () => {
        if (frame !== undefined) {
          cancelAnimationFrame(frame);
          frame = undefined;
        }
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onEnd);
        document.removeEventListener('touchmove', onMove);
        document.removeEventListener('touchend', onEnd);
        stopResizeRef.current = undefined;
        setResizingColumnId(undefined);
      };
      // Report a resize once the user lets go of the handle, not on every pointer move.
      const onEnd = () => {
        stop();
        if (currentWidth !== startWidth) {
          onColumnResize?.({ columnId: column.id, width: currentWidth });
          // The last pointer position, in case the frame for it was cancelled.
          setDragWidths((prev) => ({ ...prev, [column.id]: currentWidth }));
        }
        if (columnWidths) {
          // Controlled: from now on the width comes from `columnWidths`.
          setDragWidths((prev) => {
            const { [column.id]: _dropped, ...rest } = prev;
            return rest;
          });
        }
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onEnd);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('touchend', onEnd);
      stopResizeRef.current = stop;
    },
    [columns, columnWidths, onColumnResize]
  );

  const resetColumnWidth = useCallback(
    (columnIndex: number) => {
      const column = columns[columnIndex];
      if (!column) {
        return;
      }
      // Drop the user's width, the column falls back to its initial width. No width is reported,
      // so a controlled parent drops it too and a function `initialWidth` keeps following the grid.
      setDragWidths(({ [column.id]: _dropped, ...rest }) => rest);
      onColumnResize?.({ columnId: column.id, width: undefined });
    },
    [columns, onColumnResize]
  );

  return { widths, resizingColumnId, startResize, resetColumnWidth };
};
