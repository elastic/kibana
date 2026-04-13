/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { keys } from '@elastic/eui';

interface GridNavigationOptions {
  gridColumns: number;
  gridRows: number;
  totalRows: number;
  gridRef: React.RefObject<HTMLDivElement>;
}

export const useGridNavigation = ({
  gridColumns,
  gridRows,
  totalRows,
  gridRef,
}: GridNavigationOptions) => {
  const [focusedCell, setFocusedCell] = useState<{ rowIndex: number; colIndex: number }>({
    rowIndex: 0,
    colIndex: 0,
  });

  const prevLayoutRef = useRef<{ totalRows: number; gridColumns: number } | null>(null);
  useLayoutEffect(() => {
    const prev = prevLayoutRef.current;
    prevLayoutRef.current = { totalRows, gridColumns };
    if (prev === null) {
      return;
    }
    if (prev.totalRows === totalRows && prev.gridColumns === gridColumns) {
      return;
    }
    if (totalRows <= 0) {
      return;
    }
    setFocusedCell({ rowIndex: 0, colIndex: 0 });
  }, [totalRows, gridColumns]);

  const getRowColFromIndex = useCallback(
    (index: number) => ({
      rowIndex: Math.floor(index / gridColumns),
      colIndex: index % gridColumns,
    }),
    [gridColumns]
  );

  const getIndexFromRowCol = useCallback(
    (rowIndex: number, colIndex: number) => rowIndex * gridColumns + colIndex,
    [gridColumns]
  );

  const getCellAt = useCallback(
    (rowIndex: number, colIndex: number): HTMLElement | null => {
      if (!gridRef.current) return null;
      const index = getIndexFromRowCol(rowIndex, colIndex);
      if (index >= totalRows) return null;

      return gridRef.current.querySelector(`[data-grid-cell="${rowIndex}-${colIndex}"]`);
    },
    [gridRef, getIndexFromRowCol, totalRows]
  );

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const cell = getCellAt(rowIndex, colIndex);
      if (cell) {
        cell.focus();
        setFocusedCell({ rowIndex, colIndex });
      }
    },
    [getCellAt]
  );

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const { rowIndex, colIndex } = focusedCell;
      let newRowIndex = rowIndex;
      let newColIndex = colIndex;

      switch (event.key) {
        case keys.ARROW_UP:
          event.preventDefault();
          newRowIndex = Math.max(0, rowIndex - 1);
          break;

        case keys.ARROW_DOWN: {
          event.preventDefault();
          const nextRow = Math.min(gridRows - 1, rowIndex + 1);
          if (nextRow > rowIndex) {
            newRowIndex = nextRow;
            const rowStartIndex = nextRow * gridColumns;
            const maxColInRow = Math.min(
              gridColumns - 1,
              Math.max(0, totalRows - 1 - rowStartIndex)
            );
            newColIndex = Math.min(colIndex, maxColInRow);
          }
          break;
        }

        case keys.ARROW_LEFT:
          event.preventDefault();
          newColIndex = Math.max(0, colIndex - 1);
          break;

        case keys.ARROW_RIGHT:
          event.preventDefault();
          newColIndex = Math.min(gridColumns - 1, colIndex + 1);
          break;

        default:
          return; // Don't prevent default for other keys
      }

      // Validate that the new position corresponds to an actual item
      const targetIndex = getIndexFromRowCol(newRowIndex, newColIndex);

      if ((newRowIndex !== rowIndex || newColIndex !== colIndex) && targetIndex < totalRows) {
        focusCell(newRowIndex, newColIndex);
      }
    },
    [focusedCell, gridRows, gridColumns, totalRows, getIndexFromRowCol, focusCell]
  );

  const handleFocusCell = useCallback((rowIndex: number, colIndex: number) => {
    setFocusedCell({ rowIndex, colIndex });
  }, []);

  return {
    focusedCell,
    handleKeyDown,
    handleFocusCell,
    focusCell,
    getRowColFromIndex,
  };
};
