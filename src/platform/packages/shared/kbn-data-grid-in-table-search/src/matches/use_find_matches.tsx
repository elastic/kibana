/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { AllCellsMatchesCounter } from './all_cells_matches_counter';
import {
  ActiveMatch,
  RowMatches,
  UseFindMatchesState,
  UseFindMatchesProps,
  UseFindMatchesReturn,
  AllCellsProps,
} from '../types';

const INITIAL_STATE: UseFindMatchesState = {
  matchesList: [],
  matchesCount: null,
  activeMatchPosition: null,
  columns: [],
  isProcessing: false,
  renderCellsShadowPortal: null,
};

export const useFindMatches = (props: UseFindMatchesProps): UseFindMatchesReturn => {
  const { inTableSearchTerm, visibleColumns, rows, renderCellValue, onScrollToActiveMatch } = props;
  const [state, setState] = useState<UseFindMatchesState>(INITIAL_STATE);
  const { matchesCount, activeMatchPosition, isProcessing, renderCellsShadowPortal } = state;
  const numberOfRunsRef = useRef<number>(0);

  useEffect(() => {
    numberOfRunsRef.current += 1;

    if (!rows?.length || !inTableSearchTerm?.length) {
      setState(INITIAL_STATE);
      return;
    }

    // const startTime = window.performance.now();

    const numberOfRuns = numberOfRunsRef.current;

    const onFinish: AllCellsProps['onFinish'] = ({
      matchesList: nextMatchesList,
      totalMatchesCount,
    }) => {
      if (numberOfRuns < numberOfRunsRef.current) {
        return;
      }

      const nextActiveMatchPosition = totalMatchesCount > 0 ? 1 : null;
      setState({
        matchesList: nextMatchesList,
        matchesCount: totalMatchesCount,
        activeMatchPosition: nextActiveMatchPosition,
        columns: visibleColumns,
        isProcessing: false,
        renderCellsShadowPortal: null,
      });

      if (totalMatchesCount > 0) {
        updateActiveMatchPosition({
          matchPosition: nextActiveMatchPosition,
          matchesList: nextMatchesList,
          columns: visibleColumns,
          onScrollToActiveMatch,
        });
      }

      // const duration = window.performance.now() - startTime;
      // console.log(duration);
    };

    const RenderCellsShadowPortal: UseFindMatchesState['renderCellsShadowPortal'] = () => (
      <AllCellsMatchesCounter
        key={numberOfRuns}
        inTableSearchTerm={inTableSearchTerm}
        rowsCount={rows.length}
        visibleColumns={visibleColumns}
        renderCellValue={renderCellValue}
        onFinish={onFinish}
      />
    );

    setState((prevState) => ({
      ...prevState,
      isProcessing: true,
      renderCellsShadowPortal: RenderCellsShadowPortal,
    }));
  }, [setState, renderCellValue, visibleColumns, rows, inTableSearchTerm, onScrollToActiveMatch]);

  const goToPrevMatch = useCallback(() => {
    setState((prevState) => changeActiveMatchInState(prevState, 'prev', onScrollToActiveMatch));
  }, [setState, onScrollToActiveMatch]);

  const goToNextMatch = useCallback(() => {
    setState((prevState) => changeActiveMatchInState(prevState, 'next', onScrollToActiveMatch));
  }, [setState, onScrollToActiveMatch]);

  const resetState = useCallback(() => {
    setState(INITIAL_STATE);
  }, [setState]);

  return useMemo(
    () => ({
      matchesCount,
      activeMatchPosition,
      goToPrevMatch,
      goToNextMatch,
      resetState,
      isProcessing,
      renderCellsShadowPortal,
    }),
    [
      matchesCount,
      activeMatchPosition,
      goToPrevMatch,
      goToNextMatch,
      resetState,
      isProcessing,
      renderCellsShadowPortal,
    ]
  );
};

function getActiveMatchForPosition({
  matchPosition,
  matchesList,
  columns,
}: {
  matchPosition: number;
  matchesList: RowMatches[];
  columns: string[];
}): ActiveMatch | null {
  let traversedMatchesCount = 0;

  for (const rowMatch of matchesList) {
    const rowIndex = rowMatch.rowIndex;

    if (traversedMatchesCount + rowMatch.rowMatchesCount < matchPosition) {
      // going faster to next row
      traversedMatchesCount += rowMatch.rowMatchesCount;
      continue;
    }

    const matchesCountPerColumnId = rowMatch.matchesCountPerColumnId;

    for (const columnId of columns) {
      // going slow to next cell within the row
      const matchesCountInCell = matchesCountPerColumnId[columnId] ?? 0;

      if (
        traversedMatchesCount < matchPosition &&
        traversedMatchesCount + matchesCountInCell >= matchPosition
      ) {
        // can even go slower to next match within the cell
        return {
          rowIndex: Number(rowIndex),
          columnId,
          matchIndexWithinCell: matchPosition - traversedMatchesCount - 1,
        };
      }

      traversedMatchesCount += matchesCountInCell;
    }
  }

  // no match found for the requested position
  return null;
}

let prevJumpTimer: NodeJS.Timeout | null = null;

function updateActiveMatchPosition({
  matchPosition,
  matchesList,
  columns,
  onScrollToActiveMatch,
}: {
  matchPosition: number | null;
  matchesList: RowMatches[];
  columns: string[];
  onScrollToActiveMatch: (activeMatch: ActiveMatch) => void;
}) {
  if (typeof matchPosition !== 'number') {
    return;
  }

  if (prevJumpTimer) {
    clearTimeout(prevJumpTimer);
  }

  prevJumpTimer = setTimeout(() => {
    const activeMatch = getActiveMatchForPosition({
      matchPosition,
      matchesList,
      columns,
    });

    if (activeMatch) {
      onScrollToActiveMatch(activeMatch);
    }
  }, 0);
}

function changeActiveMatchInState(
  prevState: UseFindMatchesState,
  direction: 'prev' | 'next',
  onScrollToActiveMatch: (activeMatch: ActiveMatch) => void
): UseFindMatchesState {
  if (
    typeof prevState.matchesCount !== 'number' ||
    !prevState.activeMatchPosition ||
    prevState.isProcessing
  ) {
    return prevState;
  }

  let nextMatchPosition =
    direction === 'prev' ? prevState.activeMatchPosition - 1 : prevState.activeMatchPosition + 1;

  if (nextMatchPosition < 1) {
    nextMatchPosition = prevState.matchesCount; // allow to endlessly circle though matches
  } else if (nextMatchPosition > prevState.matchesCount) {
    nextMatchPosition = 1; // allow to endlessly circle though matches
  }

  updateActiveMatchPosition({
    matchPosition: nextMatchPosition,
    matchesList: prevState.matchesList,
    columns: prevState.columns,
    onScrollToActiveMatch,
  });

  return {
    ...prevState,
    activeMatchPosition: nextMatchPosition,
  };
}
