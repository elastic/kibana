/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { AllCellsMatchesCounter } from './all_cells_matches_counter';
import type {
  ActiveMatch,
  RowMatches,
  UseFindMatchesState,
  UseFindMatchesProps,
  UseFindMatchesReturn,
  AllCellsProps,
} from '../types';
import {
  useInTableSearchControlProps,
  useInTableSearchMatchContext,
} from '../in_table_search_context';

export const INITIAL_STATE: UseFindMatchesState = {
  term: '',
  matchesList: [],
  matchesCount: null,
  activeMatchPosition: null,
  columns: [],
  isProcessing: false,
  renderCellsShadowPortal: null,
};

const FIRST_ACTIVE_MATCH_POSITION = 1;

export const useFindMatches = (props: UseFindMatchesProps): UseFindMatchesReturn => {
  const { initialState, onScrollToActiveMatch } = props;
  const controlProps = useInTableSearchControlProps();
  const { matchState: state, setMatchState: setState } = useInTableSearchMatchContext();
  const { inTableSearchTerm, visibleColumns, rows, renderCellValue, onInitialStateChange } =
    controlProps;

  const initialActiveMatchPositionRef = useRef<number | undefined>(
    initialState?.current?.activeMatch?.matchPosition &&
      initialState?.current?.searchTerm === inTableSearchTerm
      ? initialState.current?.activeMatch?.matchPosition
      : undefined
  );

  const { matchesCount, activeMatchPosition, isProcessing, renderCellsShadowPortal } = state;
  const numberOfRunsRef = useRef<number>(0);

  useEffect(() => {
    numberOfRunsRef.current += 1;

    if (!rows?.length || !inTableSearchTerm?.length) {
      setState(INITIAL_STATE);
      return;
    }

    // if the search term from the restorable state matches the context term and we already have results (state.term set),
    // Skip redundant processing because we've already run for this term.
    if (
      initialState?.current?.searchTerm === inTableSearchTerm &&
      state.term === inTableSearchTerm
    ) {
      return;
    }

    const numberOfRuns = numberOfRunsRef.current;

    const onFinish: AllCellsProps['onFinish'] = ({
      term,
      matchesList: nextMatchesList,
      totalMatchesCount,
    }) => {
      if (numberOfRuns < numberOfRunsRef.current) {
        return;
      }

      const initialActiveMatchPosition = initialActiveMatchPositionRef.current;
      initialActiveMatchPositionRef.current = undefined;

      const nextActiveMatchPosition =
        totalMatchesCount > 0 ? initialActiveMatchPosition ?? FIRST_ACTIVE_MATCH_POSITION : null;

      setState({
        term,
        matchesList: nextMatchesList,
        matchesCount: totalMatchesCount,
        activeMatchPosition: nextActiveMatchPosition,
        columns: visibleColumns,
        isProcessing: false,
        renderCellsShadowPortal: null,
      });

      if (totalMatchesCount > 0) {
        updateActiveMatchPosition({
          term,
          animate: !initialActiveMatchPosition,
          matchPosition: nextActiveMatchPosition,
          matchesList: nextMatchesList,
          columns: visibleColumns,
          onScrollToActiveMatch,
          onInitialStateChange,
        });
      } else {
        onInitialStateChange?.({
          searchTerm: term,
          activeMatch: undefined,
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
      term: inTableSearchTerm,
      isProcessing: true,
      renderCellsShadowPortal: RenderCellsShadowPortal,
    }));
  }, [
    setState,
    renderCellValue,
    visibleColumns,
    rows,
    inTableSearchTerm,
    onScrollToActiveMatch,
    onInitialStateChange,
    initialState,
    state.term,
  ]);

  const goToPrevMatch = useCallback(() => {
    setState((prevState) =>
      changeActiveMatchInState(prevState, 'prev', onScrollToActiveMatch, onInitialStateChange)
    );
  }, [setState, onScrollToActiveMatch, onInitialStateChange]);

  const goToNextMatch = useCallback(() => {
    setState((prevState) =>
      changeActiveMatchInState(prevState, 'next', onScrollToActiveMatch, onInitialStateChange)
    );
  }, [setState, onScrollToActiveMatch, onInitialStateChange]);

  const resetState = useCallback(() => {
    setState(INITIAL_STATE);
    onInitialStateChange?.({
      searchTerm: undefined,
      activeMatch: undefined,
    });
  }, [setState, onInitialStateChange]);

  return useMemo(
    () => ({
      term: state.term,
      matchesCount,
      activeMatchPosition,
      goToPrevMatch,
      goToNextMatch,
      resetState,
      isProcessing,
      renderCellsShadowPortal,
    }),
    [
      state.term,
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
          matchPosition,
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
  animate = true,
  term,
  matchPosition,
  matchesList,
  columns,
  onScrollToActiveMatch,
  onInitialStateChange,
}: {
  animate?: boolean;
  term: string;
  matchPosition: number | null;
  matchesList: RowMatches[];
  columns: string[];
  onScrollToActiveMatch: UseFindMatchesProps['onScrollToActiveMatch'];
  onInitialStateChange: UseFindMatchesProps['onInitialStateChange'];
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
      onScrollToActiveMatch(activeMatch, animate);
    }

    if (animate) {
      onInitialStateChange?.({
        searchTerm: term,
        activeMatch: activeMatch || undefined,
      });
    }
  }, 0);
}

function changeActiveMatchInState(
  prevState: UseFindMatchesState,
  direction: 'prev' | 'next',
  onScrollToActiveMatch: UseFindMatchesProps['onScrollToActiveMatch'],
  onInitialStateChange: UseFindMatchesProps['onInitialStateChange']
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
    term: prevState.term,
    matchPosition: nextMatchPosition,
    matchesList: prevState.matchesList,
    columns: prevState.columns,
    onScrollToActiveMatch,
    onInitialStateChange,
  });

  return {
    ...prevState,
    activeMatchPosition: nextMatchPosition,
  };
}
