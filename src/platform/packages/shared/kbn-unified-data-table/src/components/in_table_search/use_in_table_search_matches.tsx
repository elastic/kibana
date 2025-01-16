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
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { UnifiedDataTableContext } from '../../table_context';
import { InTableSearchHighlightsWrapperProps } from './in_table_search_highlights_wrapper';

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
  renderCellValue: (
    props: EuiDataGridCellValueElementProps &
      Pick<InTableSearchHighlightsWrapperProps, 'onHighlightsCountFound'>
  ) => ReactNode;
  scrollToFoundMatch: (params: {
    rowIndex: number;
    fieldName: string;
    matchIndex: number;
    shouldJump: boolean;
  }) => void;
}

export interface UseInTableSearchMatchesReturn {
  matchesCount: number;
  activeMatchPosition: number;
  isProcessing: boolean;
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
}

export const useInTableSearchMatches = ({
  visibleColumns,
  rows,
  inTableSearchTerm,
  renderCellValue,
  scrollToFoundMatch,
}: UseInTableSearchMatchesProps): UseInTableSearchMatchesReturn => {
  const [matchesList, setMatchesList] = useState<RowMatches[]>(DEFAULT_MATCHES);
  const [matchesCount, setMatchesCount] = useState<number>(0);
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
            scrollToFoundMatch({
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
    [scrollToFoundMatch]
  );

  const goToPrevMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (prev - 1 < 1) {
        return prev;
      }
      const nextMatchPosition = prev - 1;
      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesList: matchesList,
        activeColumns: visibleColumns,
        shouldJump: true,
      });
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesList, visibleColumns]);

  const goToNextMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (prev + 1 > matchesCount) {
        return prev;
      }
      const nextMatchPosition = prev + 1;
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
      setMatchesCount(0);
      setActiveMatchPosition(DEFAULT_ACTIVE_MATCH_POSITION);
      return;
    }

    setIsProcessing(true);

    const findMatches = async () => {
      const result: RowMatches[] = [];
      let totalMatchesCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const matchesCountPerField: Record<string, number> = {};
        let rowMatchesCount = 0;

        for (const fieldName of visibleColumns) {
          const matchesCountForFieldName = await getCellMatchesCount(
            inTableSearchTerm,
            rowIndex,
            fieldName,
            renderCellValue
          );

          if (matchesCountForFieldName) {
            matchesCountPerField[fieldName] = matchesCountForFieldName;
            totalMatchesCount += matchesCountForFieldName;
            rowMatchesCount += matchesCountForFieldName;
          }
        }

        if (Object.keys(matchesCountPerField).length) {
          result.push({
            rowIndex,
            rowMatchesCount,
            matchesCountPerField,
          });
        }
      }

      const nextMatchesList = totalMatchesCount > 0 ? result : DEFAULT_MATCHES;
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
  ]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    isProcessing,
  };
};

function getCellMatchesCount(
  inTableSearchTerm: string,
  rowIndex: number,
  fieldName: string,
  renderCellValue: UseInTableSearchMatchesProps['renderCellValue']
): Promise<number> {
  const UnifiedDataTableRenderCellValue = renderCellValue;

  const container = document.createElement('div');
  // TODO: add a timeout to prevent infinite waiting
  return new Promise((resolve) => {
    ReactDOM.render(
      <UnifiedDataTableContext.Provider
        value={{
          inTableSearchTerm,
          // TODO: add other context values?
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
            resolve(count);
            ReactDOM.unmountComponentAtNode(container);
          }}
        />
      </UnifiedDataTableContext.Provider>,
      container
    );
  });
}
