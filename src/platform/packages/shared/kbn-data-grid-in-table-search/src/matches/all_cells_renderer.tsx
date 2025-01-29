/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState, useCallback } from 'react';
import { RowCellsRenderer } from './row_cells_renderer';
import { AllCellsProps, RowMatches } from '../types';

// Processes rows in chunks:
// - to don't block the main thread for too long
// - and to let users continue interacting with the input which would cancel the processing and start a new one.
const INITIAL_ROWS_CHUNK_SIZE = 10;
// Increases the chunk size by 10 each time. This will increase the speed of processing with each iteration as we get more certain that user is waiting for its completion.
const ROWS_CHUNK_SIZE_INCREMENT = 10;
const ROWS_CHUNK_SIZE_MAX = 100;

export function AllCellsRenderer(props: AllCellsProps) {
  const { inTableSearchTerm, visibleColumns, renderCellValue, rowsCount, onFinish } = props;
  const matchesListRef = useRef<RowMatches[]>([]);
  const totalMatchesCountRef = useRef<number>(0);
  const initialChunkSize = Math.min(INITIAL_ROWS_CHUNK_SIZE, rowsCount);
  const [{ chunkStartRowIndex, chunkSize }, setChunk] = useState<{
    chunkStartRowIndex: number;
    chunkSize: number;
  }>({ chunkStartRowIndex: 0, chunkSize: initialChunkSize });
  const chunkRowResultsMapRef = useRef<Record<number, RowMatches>>({});
  const chunkRemainingRowsCountRef = useRef<number>(initialChunkSize);

  // All cells in the row were processed, and we now know how many matches are in the row.
  const onRowProcessed = useCallback(
    (rowMatches: RowMatches) => {
      if (rowMatches.rowMatchesCount > 0) {
        totalMatchesCountRef.current += rowMatches.rowMatchesCount;
        chunkRowResultsMapRef.current[rowMatches.rowIndex] = rowMatches;
      }

      chunkRemainingRowsCountRef.current -= 1;

      if (chunkRemainingRowsCountRef.current > 0) {
        // still waiting for more rows within the chunk to finish
        return;
      }

      // all rows within the chunk have been processed
      // saving the results in the right order
      Object.keys(chunkRowResultsMapRef.current)
        .sort((a, b) => Number(a) - Number(b))
        .forEach((finishedRowIndex) => {
          matchesListRef.current.push(chunkRowResultsMapRef.current[Number(finishedRowIndex)]);
        });

      // moving to the next chunk if there are more rows to process
      const nextRowIndex = chunkStartRowIndex + chunkSize;

      if (nextRowIndex < rowsCount) {
        const increasedChunkSize = Math.min(
          ROWS_CHUNK_SIZE_MAX,
          chunkSize + ROWS_CHUNK_SIZE_INCREMENT
        );
        const nextChunkSize = Math.min(increasedChunkSize, rowsCount - nextRowIndex);
        chunkRowResultsMapRef.current = {};
        chunkRemainingRowsCountRef.current = nextChunkSize;
        setChunk({ chunkStartRowIndex: nextRowIndex, chunkSize: nextChunkSize });
      } else {
        onFinish({
          matchesList: matchesListRef.current,
          totalMatchesCount: totalMatchesCountRef.current,
        });
      }
    },
    [setChunk, chunkStartRowIndex, chunkSize, rowsCount, onFinish]
  );

  // Iterating through rows one chunk at the time to avoid blocking the main thread.
  // If user changes inTableSearchTerm, this component would unmount and the processing would be interrupted right away. Next time it would start from rowIndex 0.
  return (
    <>
      {Array.from({ length: chunkSize }).map((_, index) => {
        const rowIndex = chunkStartRowIndex + index;
        return (
          <RowCellsRenderer
            key={rowIndex}
            rowIndex={rowIndex}
            inTableSearchTerm={inTableSearchTerm}
            visibleColumns={visibleColumns}
            renderCellValue={renderCellValue}
            onRowProcessed={onRowProcessed}
          />
        );
      })}
    </>
  );
}
