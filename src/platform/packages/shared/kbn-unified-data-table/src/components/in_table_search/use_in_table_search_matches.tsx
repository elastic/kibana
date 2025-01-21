/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, ReactNode, useRef, useMemo } from 'react';
import { createPortal, unmountComponentAtNode } from 'react-dom';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { InTableSearchHighlightsWrapperProps } from './in_table_search_highlights_wrapper';

let latestTimeoutTimer: NodeJS.Timeout | null = null;

interface RowMatches {
  rowIndex: number;
  rowMatchesCount: number;
  matchesCountPerColumnId: Record<string, number>;
}

interface ActiveMatch {
  rowIndex: number;
  columnId: string;
  matchIndexWithinCell: number;
}

export interface UseInTableSearchMatchesProps {
  inTableSearchTerm: string;
  visibleColumns: string[];
  rows: DataTableRecord[];
  renderCellValue: (
    props: EuiDataGridCellValueElementProps &
      Pick<InTableSearchHighlightsWrapperProps, 'inTableSearchTerm' | 'onHighlightsCountFound'>
  ) => ReactNode;
  onScrollToActiveMatch: (activeMatch: ActiveMatch) => void;
}

interface UseInTableSearchMatchesState {
  matchesList: RowMatches[];
  matchesCount: number | null;
  activeMatchPosition: number | null;
  columns: string[];
  isProcessing: boolean;
  renderCellsShadowPortal: (() => ReactNode) | null;
}

export interface UseInTableSearchMatchesReturn
  extends Omit<UseInTableSearchMatchesState, 'matchesList' | 'columns'> {
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
  resetState: () => void;
}

const INITIAL_STATE: UseInTableSearchMatchesState = {
  matchesList: [],
  matchesCount: null,
  activeMatchPosition: null,
  columns: [],
  isProcessing: false,
  renderCellsShadowPortal: null,
};

export const useInTableSearchMatches = (
  props: UseInTableSearchMatchesProps
): UseInTableSearchMatchesReturn => {
  const { inTableSearchTerm, visibleColumns, rows, renderCellValue, onScrollToActiveMatch } = props;
  const [state, setState] = useState<UseInTableSearchMatchesState>(INITIAL_STATE);
  const { matchesCount, activeMatchPosition, isProcessing, renderCellsShadowPortal } = state;
  const numberOfRunsRef = useRef<number>(0);

  useEffect(() => {
    numberOfRunsRef.current += 1;

    if (!rows?.length || !inTableSearchTerm?.length) {
      setState(INITIAL_STATE);
      return;
    }

    const numberOfRuns = numberOfRunsRef.current;

    stopTimer(latestTimeoutTimer);

    setState((prevState) => ({
      ...prevState,
      isProcessing: true,
      renderCellsShadowPortal: () => (
        <AllCellsHighlightsCounter
          key={numberOfRuns}
          inTableSearchTerm={inTableSearchTerm}
          rows={rows}
          visibleColumns={visibleColumns}
          renderCellValue={renderCellValue}
          onFinish={({ matchesList: nextMatchesList, totalMatchesCount }) => {
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
          }}
        />
      ),
    }));
  }, [setState, renderCellValue, visibleColumns, rows, inTableSearchTerm, onScrollToActiveMatch]);

  const goToPrevMatch = useCallback(() => {
    setState((prevState) => changeActiveMatchInState(prevState, 'prev', onScrollToActiveMatch));
  }, [setState, onScrollToActiveMatch]);

  const goToNextMatch = useCallback(() => {
    setState((prevState) => changeActiveMatchInState(prevState, 'next', onScrollToActiveMatch));
  }, [setState, onScrollToActiveMatch]);

  const resetState = useCallback(() => {
    stopTimer(latestTimeoutTimer);
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

function getActiveMatch({
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

  setTimeout(() => {
    const activeMatch = getActiveMatch({
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
  prevState: UseInTableSearchMatchesState,
  direction: 'prev' | 'next',
  onScrollToActiveMatch: (activeMatch: ActiveMatch) => void
): UseInTableSearchMatchesState {
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

type AllCellsProps = Pick<
  UseInTableSearchMatchesProps,
  'renderCellValue' | 'rows' | 'visibleColumns'
> & { inTableSearchTerm: string };

function AllCellsHighlightsCounter(
  props: AllCellsProps & {
    onFinish: (params: { matchesList: RowMatches[]; totalMatchesCount: number }) => void;
  }
) {
  const [container] = useState(() => document.createDocumentFragment());
  const containerRef = useRef<DocumentFragment>();
  containerRef.current = container;

  const { rows, visibleColumns, onFinish } = props;
  const resultsMapRef = useRef<Record<number, Record<string, number>>>({});
  const remainingNumberOfResultsRef = useRef<number>(rows.length * visibleColumns.length);

  const onHighlightsCountFound = useCallback(
    (rowIndex: number, columnId: string, count: number) => {
      remainingNumberOfResultsRef.current = remainingNumberOfResultsRef.current - 1;

      if (count === 0) {
        return;
      }

      if (!resultsMapRef.current[rowIndex]) {
        resultsMapRef.current[rowIndex] = {};
      }
      resultsMapRef.current[rowIndex][columnId] = count;
    },
    []
  );

  const onComplete = useCallback(() => {
    let totalMatchesCount = 0;
    const newMatchesList: RowMatches[] = [];

    Object.keys(resultsMapRef.current)
      .map((rowIndex) => Number(rowIndex))
      .sort((a, b) => a - b)
      .forEach((rowIndex) => {
        const matchesCountPerColumnId = resultsMapRef.current[rowIndex];
        const rowMatchesCount = Object.values(matchesCountPerColumnId).reduce(
          (acc, count) => acc + count,
          0
        );

        newMatchesList.push({
          rowIndex,
          rowMatchesCount,
          matchesCountPerColumnId,
        });
        totalMatchesCount += rowMatchesCount;
      });

    onFinish({ matchesList: newMatchesList, totalMatchesCount });
  }, [onFinish]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [_] = useState(() => {
    const newTimer = setTimeout(onComplete, 30000);
    timerRef.current = newTimer;
    return registerTimer(newTimer);
  });

  useEffect(() => {
    return () => {
      stopTimer(timerRef.current);

      if (containerRef.current) {
        unmountComponentAtNode(containerRef.current);
      }
    };
  }, []);

  return createPortal(
    <AllCells
      {...props}
      onHighlightsCountFound={(rowIndex, columnId, count) => {
        onHighlightsCountFound(rowIndex, columnId, count);

        if (remainingNumberOfResultsRef.current === 0) {
          stopTimer(timerRef.current);
          onComplete();
        }
      }}
    />,
    container
  );
}

function AllCells({
  inTableSearchTerm,
  rows,
  visibleColumns,
  renderCellValue,
  onHighlightsCountFound,
}: AllCellsProps & {
  onHighlightsCountFound: (rowIndex: number, columnId: string, count: number) => void;
}) {
  const UnifiedDataTableRenderCellValue = renderCellValue;

  return (
    <>
      {(rows || []).flatMap((_, rowIndex) => {
        return visibleColumns.map((columnId) => {
          return (
            <ErrorBoundary
              key={`${rowIndex}-${columnId}`}
              onError={() => {
                onHighlightsCountFound(rowIndex, columnId, 0);
              }}
            >
              <UnifiedDataTableRenderCellValue
                columnId={columnId}
                rowIndex={rowIndex}
                isExpandable={false}
                isExpanded={false}
                isDetails={false}
                colIndex={0}
                setCellProps={() => {}}
                inTableSearchTerm={inTableSearchTerm}
                onHighlightsCountFound={(count) => {
                  onHighlightsCountFound(rowIndex, columnId, count);
                }}
              />
            </ErrorBoundary>
          );
        });
      })}
    </>
  );
}

/**
 * Renders nothing instead of a component which triggered an exception.
 */
export class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{
    onError?: () => void;
  }>,
  { hasError: boolean }
> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch() {
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return null;
    }

    return this.props.children;
  }
}

function registerTimer(timer: NodeJS.Timeout) {
  stopTimer(latestTimeoutTimer);
  latestTimeoutTimer = timer;
  return timer;
}

function stopTimer(timer: NodeJS.Timeout | null) {
  if (timer) {
    clearTimeout(timer);
  }
}
