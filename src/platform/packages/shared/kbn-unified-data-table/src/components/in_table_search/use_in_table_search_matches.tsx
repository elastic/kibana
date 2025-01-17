/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, ReactNode } from 'react';
import ReactDOM from 'react-dom';
import {
  KibanaRenderContextProvider,
  KibanaRenderContextProviderProps,
} from '@kbn/react-kibana-context-render';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { UnifiedDataTableContext, DataTableContext } from '../../table_context';
import { InTableSearchHighlightsWrapperProps } from './in_table_search_highlights_wrapper';

type Services = Pick<KibanaRenderContextProviderProps, 'i18n' | 'theme'>;

interface RowMatches {
  rowIndex: number;
  rowMatchesCount: number;
  matchesCountPerField: Record<string, number>;
}
const DEFAULT_MATCHES: RowMatches[] = [];
const DEFAULT_ACTIVE_MATCH_POSITION = 1;

export interface UseInTableSearchMatchesProps {
  visibleColumns: string[];
  rows: DataTableRecord[] | undefined;
  inTableSearchTerm: string | undefined;
  tableContext: Omit<DataTableContext, 'inTableSearchTerm' | 'pageIndex' | 'pageSize'>;
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
  services: Services;
}

export interface UseInTableSearchMatchesReturn {
  matchesCount: number | null;
  activeMatchPosition: number;
  isProcessing: boolean;
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
}

export const useInTableSearchMatches = (
  props: UseInTableSearchMatchesProps
): UseInTableSearchMatchesReturn => {
  const {
    visibleColumns,
    rows,
    inTableSearchTerm,
    tableContext,
    renderCellValue,
    scrollToActiveMatch,
    services,
  } = props;
  const [matchesList, setMatchesList] = useState<RowMatches[]>(DEFAULT_MATCHES);
  const [matchesCount, setMatchesCount] = useState<number | null>(null);
  const [activeMatchPosition, setActiveMatchPosition] = useState<number>(
    DEFAULT_ACTIVE_MATCH_POSITION
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

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
    setActiveMatchPosition((prev) => {
      if (typeof matchesCount !== 'number') {
        return prev;
      }

      let nextMatchPosition = prev - 1;

      if (prev - 1 < 1) {
        nextMatchPosition = matchesCount; // allow to endlessly circle though matches
      }

      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesList: matchesList,
        activeColumns: visibleColumns,
        shouldJump: true,
      });
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesList, visibleColumns, matchesCount]);

  const goToNextMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (typeof matchesCount !== 'number') {
        return prev;
      }

      let nextMatchPosition = prev + 1;

      if (prev + 1 > matchesCount) {
        nextMatchPosition = 1; // allow to endlessly circle though matches
      }

      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesList: matchesList,
        activeColumns: visibleColumns,
        shouldJump: true,
      });
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesList, visibleColumns, matchesCount]);

  useEffect(() => {
    if (!rows?.length || !inTableSearchTerm?.length) {
      setMatchesList(DEFAULT_MATCHES);
      setMatchesCount(null);
      setActiveMatchPosition(DEFAULT_ACTIVE_MATCH_POSITION);
      return;
    }

    setIsProcessing(true);

    const findMatches = async () => {
      const { matchesList: nextMatchesList, totalMatchesCount } = await getCellMatchesCounts({
        inTableSearchTerm,
        tableContext,
        renderCellValue,
        rows,
        visibleColumns,
        services,
      });

      const nextActiveMatchPosition = DEFAULT_ACTIVE_MATCH_POSITION;
      setMatchesList(nextMatchesList);
      setMatchesCount(totalMatchesCount);
      setActiveMatchPosition(nextActiveMatchPosition);
      setIsProcessing(false);

      if (totalMatchesCount > 0) {
        scrollToMatch({
          matchPosition: nextActiveMatchPosition,
          activeMatchesList: nextMatchesList,
          activeColumns: visibleColumns,
          shouldJump: false,
        });
      }
    };

    void findMatches();
  }, [
    setMatchesList,
    setMatchesCount,
    setActiveMatchPosition,
    setIsProcessing,
    renderCellValue,
    scrollToMatch,
    visibleColumns,
    rows,
    inTableSearchTerm,
    tableContext,
    services,
  ]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    isProcessing,
  };
};

function getCellMatchesCounts(
  props: Pick<
    UseInTableSearchMatchesProps,
    | 'inTableSearchTerm'
    | 'tableContext'
    | 'renderCellValue'
    | 'rows'
    | 'visibleColumns'
    | 'services'
  >
): Promise<{ matchesList: RowMatches[]; totalMatchesCount: number }> {
  const { rows, visibleColumns } = props;

  if (!rows?.length || !visibleColumns?.length) {
    return Promise.resolve({ matchesList: DEFAULT_MATCHES, totalMatchesCount: 0 });
  }

  const resultsMap: Record<number, Record<string, number>> = {};
  let remainingNumberOfResults = rows.length * visibleColumns.length;

  const onHighlightsCountFound = (rowIndex: number, fieldName: string, count: number) => {
    remainingNumberOfResults--;

    if (count === 0) {
      return;
    }

    if (!resultsMap[rowIndex]) {
      resultsMap[rowIndex] = {};
    }
    resultsMap[rowIndex][fieldName] = count;
  };

  const container = document.createElement('div');

  return new Promise<{ matchesList: RowMatches[]; totalMatchesCount: number }>((resolve) => {
    const finish = () => {
      let totalMatchesCount = 0;
      const newMatchesList: RowMatches[] = [];

      Object.keys(resultsMap)
        .map((rowIndex) => Number(rowIndex))
        .sort((a, b) => a - b)
        .forEach((rowIndex) => {
          const matchesCountPerField = resultsMap[rowIndex];
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

      resolve({ matchesList: newMatchesList, totalMatchesCount });
      ReactDOM.unmountComponentAtNode(container);
    };

    const timer = setTimeout(() => {
      // time out if rendering takes longer
      finish();
    }, 60000);

    // render all cells in parallel and get the count of highlights as the result
    ReactDOM.render(
      <AllCells
        {...props}
        onHighlightsCountFound={(rowIndex, fieldName, count) => {
          onHighlightsCountFound(rowIndex, fieldName, count);

          if (remainingNumberOfResults === 0) {
            clearTimeout(timer);
            finish();
          }
        }}
      />,
      container
    );
  }).catch(() => ({ matchesList: DEFAULT_MATCHES, totalMatchesCount: 0 })); // catching unexpected errors
}

function AllCells({
  inTableSearchTerm,
  rows,
  visibleColumns,
  renderCellValue,
  tableContext,
  services,
  onHighlightsCountFound,
}: Pick<
  UseInTableSearchMatchesProps,
  'inTableSearchTerm' | 'tableContext' | 'renderCellValue' | 'rows' | 'visibleColumns' | 'services'
> & { onHighlightsCountFound: (rowIndex: number, fieldName: string, count: number) => void }) {
  const UnifiedDataTableRenderCellValue = renderCellValue;

  return (
    <KibanaRenderContextProvider {...services}>
      <UnifiedDataTableContext.Provider
        value={{
          ...tableContext,
          inTableSearchTerm,
          pageIndex: 0,
          pageSize: rows?.length ?? 0,
        }}
      >
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
      </UnifiedDataTableContext.Provider>
    </KibanaRenderContextProvider>
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
