/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, ReactNode, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { InTableSearchContext, InTableSearchContextValue } from './in_table_search_context';
import { InTableSearchHighlightsWrapperProps } from './in_table_search_highlights_wrapper';

let latestTimeoutTimer: NodeJS.Timeout | null = null;

interface RowMatches {
  rowIndex: number;
  rowMatchesCount: number;
  matchesCountPerField: Record<string, number>;
}

export interface UseInTableSearchMatchesProps {
  visibleColumns: string[];
  rows: DataTableRecord[];
  inTableSearchTerm: string;
  renderCellValue: (
    props: EuiDataGridCellValueElementProps &
      Pick<InTableSearchHighlightsWrapperProps, 'onHighlightsCountFound'>
  ) => ReactNode;
  scrollToActiveMatch: (params: {
    rowIndex: number;
    fieldName: string;
    matchIndex: number;
    shouldJump: boolean;
  }) => void;
}

interface UseInTableSearchMatchesState {
  matchesList: RowMatches[];
  matchesCount: number | null;
  activeMatchPosition: number;
  isProcessing: boolean;
  cellsShadowPortal: ReactNode | null;
}

export interface UseInTableSearchMatchesReturn
  extends Omit<UseInTableSearchMatchesState, 'matchesList'> {
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
  resetState: () => void;
}

const DEFAULT_MATCHES: RowMatches[] = [];
const DEFAULT_ACTIVE_MATCH_POSITION = 1;
const INITIAL_STATE: UseInTableSearchMatchesState = {
  matchesList: DEFAULT_MATCHES,
  matchesCount: null,
  activeMatchPosition: DEFAULT_ACTIVE_MATCH_POSITION,
  isProcessing: false,
  cellsShadowPortal: null,
};

export const useInTableSearchMatches = (
  props: UseInTableSearchMatchesProps
): UseInTableSearchMatchesReturn => {
  const { visibleColumns, rows, inTableSearchTerm, renderCellValue, scrollToActiveMatch } = props;
  const [state, setState] = useState<UseInTableSearchMatchesState>(INITIAL_STATE);
  const { matchesList, matchesCount, activeMatchPosition, isProcessing, cellsShadowPortal } = state;
  const numberOfRunsRef = useRef<number>(0);

  const scrollToMatch = useCallback(
    ({
      matchPosition,
      activeMatchesList,
      activeColumns,
      shouldJump,
    }: {
      matchPosition: number;
      activeMatchesList: RowMatches[];
      activeColumns: string[];
      shouldJump: boolean;
    }) => {
      let traversedMatchesCount = 0;

      for (const rowMatch of activeMatchesList) {
        const rowIndex = rowMatch.rowIndex;

        if (traversedMatchesCount + rowMatch.rowMatchesCount < matchPosition) {
          // going faster to next row
          traversedMatchesCount += rowMatch.rowMatchesCount;
          continue;
        }

        const matchesCountPerField = rowMatch.matchesCountPerField;

        for (const fieldName of activeColumns) {
          // going slow to next field within the row
          const matchesCountForFieldName = matchesCountPerField[fieldName] ?? 0;

          if (
            traversedMatchesCount < matchPosition &&
            traversedMatchesCount + matchesCountForFieldName >= matchPosition
          ) {
            // can even go slower to next match within the field within the row
            scrollToActiveMatch({
              rowIndex: Number(rowIndex),
              fieldName,
              matchIndex: matchPosition - traversedMatchesCount - 1,
              shouldJump,
            });
            return;
          }

          traversedMatchesCount += matchesCountForFieldName;
        }
      }
    },
    [scrollToActiveMatch]
  );

  const goToPrevMatch = useCallback(() => {
    setState((prevState) => {
      if (typeof prevState.matchesCount !== 'number') {
        return prevState;
      }

      let nextMatchPosition = prevState.activeMatchPosition - 1;

      if (nextMatchPosition < 1) {
        nextMatchPosition = prevState.matchesCount; // allow to endlessly circle though matches
      }

      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesList: matchesList,
        activeColumns: visibleColumns,
        shouldJump: true,
      });

      return {
        ...prevState,
        activeMatchPosition: nextMatchPosition,
      };
    });
  }, [setState, scrollToMatch, matchesList, visibleColumns]);

  const goToNextMatch = useCallback(() => {
    setState((prevState) => {
      if (typeof prevState.matchesCount !== 'number') {
        return prevState;
      }

      let nextMatchPosition = prevState.activeMatchPosition + 1;

      if (nextMatchPosition > prevState.matchesCount) {
        nextMatchPosition = 1; // allow to endlessly circle though matches
      }

      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesList: matchesList,
        activeColumns: visibleColumns,
        shouldJump: true,
      });

      return {
        ...prevState,
        activeMatchPosition: nextMatchPosition,
      };
    });
  }, [setState, scrollToMatch, matchesList, visibleColumns]);

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
      cellsShadowPortal: (
        <AllCellsHighlightsCounter
          key={numberOfRuns}
          inTableSearchTerm={inTableSearchTerm}
          renderCellValue={renderCellValue}
          rows={rows}
          visibleColumns={visibleColumns}
          onFinish={({ matchesList: nextMatchesList, totalMatchesCount }) => {
            if (numberOfRuns < numberOfRunsRef.current) {
              return;
            }

            setState({
              matchesList: nextMatchesList,
              matchesCount: totalMatchesCount,
              activeMatchPosition: DEFAULT_ACTIVE_MATCH_POSITION,
              isProcessing: false,
              cellsShadowPortal: null,
            });

            if (totalMatchesCount > 0) {
              scrollToMatch({
                matchPosition: DEFAULT_ACTIVE_MATCH_POSITION,
                activeMatchesList: nextMatchesList,
                activeColumns: visibleColumns,
                shouldJump: true,
              });
            }
          }}
        />
      ),
    }));
  }, [setState, renderCellValue, scrollToMatch, visibleColumns, rows, inTableSearchTerm]);

  const resetState = useCallback(() => {
    stopTimer(latestTimeoutTimer);
    setState(INITIAL_STATE);
  }, [setState]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    resetState,
    isProcessing,
    cellsShadowPortal,
  };
};

type AllCellsProps = Pick<
  UseInTableSearchMatchesProps,
  'inTableSearchTerm' | 'renderCellValue' | 'rows' | 'visibleColumns'
>;

function AllCellsHighlightsCounter(
  props: AllCellsProps & {
    onFinish: (params: { matchesList: RowMatches[]; totalMatchesCount: number }) => void;
  }
) {
  const [container] = useState(() => document.createDocumentFragment());
  const { rows, visibleColumns, onFinish } = props;
  const resultsMapRef = useRef<Record<number, Record<string, number>>>({});
  const remainingNumberOfResultsRef = useRef<number>(rows.length * visibleColumns.length);

  const onHighlightsCountFound = useCallback(
    (rowIndex: number, fieldName: string, count: number) => {
      remainingNumberOfResultsRef.current = remainingNumberOfResultsRef.current - 1;

      if (count === 0) {
        return;
      }

      if (!resultsMapRef.current[rowIndex]) {
        resultsMapRef.current[rowIndex] = {};
      }
      resultsMapRef.current[rowIndex][fieldName] = count;
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
        const matchesCountPerField = resultsMapRef.current[rowIndex];
        const rowMatchesCount = Object.values(matchesCountPerField).reduce(
          (acc, count) => acc + count,
          0
        );

        newMatchesList.push({
          rowIndex,
          rowMatchesCount,
          matchesCountPerField,
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
    };
  }, []);

  return createPortal(
    <AllCells
      {...props}
      onHighlightsCountFound={(rowIndex, fieldName, count) => {
        onHighlightsCountFound(rowIndex, fieldName, count);

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
  onHighlightsCountFound: (rowIndex: number, fieldName: string, count: number) => void;
}) {
  const UnifiedDataTableRenderCellValue = renderCellValue;
  const contextValue = useMemo<InTableSearchContextValue>(
    () => ({ inTableSearchTerm }),
    [inTableSearchTerm]
  );

  return (
    <InTableSearchContext.Provider value={contextValue}>
      {(rows || []).flatMap((_, rowIndex) => {
        return visibleColumns.map((fieldName) => {
          return (
            <ErrorBoundary
              key={`${rowIndex}-${fieldName}`}
              onError={() => {
                onHighlightsCountFound(rowIndex, fieldName, 0);
              }}
            >
              <UnifiedDataTableRenderCellValue
                columnId={fieldName}
                rowIndex={rowIndex}
                isExpandable={false}
                isExpanded={false}
                isDetails={false}
                colIndex={0}
                setCellProps={() => {}}
                onHighlightsCountFound={(count) => {
                  onHighlightsCountFound(rowIndex, fieldName, count);
                }}
              />
            </ErrorBoundary>
          );
        });
      })}
    </InTableSearchContext.Provider>
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
