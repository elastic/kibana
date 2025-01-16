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
      const result: RowMatches[] = [];
      let totalMatchesCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const matchesCountPerField: Record<string, number> = {};
        let rowMatchesCount = 0;

        for (const fieldName of visibleColumns) {
          const matchesCountForFieldName = await getCellMatchesCount({
            rowIndex,
            fieldName,
            inTableSearchTerm,
            tableContext,
            renderCellValue,
            services,
          });

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

function getCellMatchesCount({
  rowIndex,
  fieldName,
  inTableSearchTerm,
  renderCellValue,
  tableContext,
  services,
}: Pick<
  UseInTableSearchMatchesProps,
  'inTableSearchTerm' | 'tableContext' | 'renderCellValue' | 'services'
> & {
  rowIndex: number;
  fieldName: string;
}): Promise<number> {
  const UnifiedDataTableRenderCellValue = renderCellValue;

  const container = document.createElement('div');
  // TODO: add a timeout to prevent infinite waiting
  return new Promise((resolve) => {
    ReactDOM.render(
      <KibanaRenderContextProvider {...services}>
        <UnifiedDataTableContext.Provider
          value={{
            ...tableContext,
            inTableSearchTerm,
            pageIndex: 0,
            pageSize: rowIndex + 1,
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
        </UnifiedDataTableContext.Provider>
      </KibanaRenderContextProvider>,
      container
    );
  });
}
