/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';

type MatchesMap = Record<number, Record<string, number>>; // per row index, per field name, number of matches
const DEFAULT_MATCHES: MatchesMap = {};
const DEFAULT_ACTIVE_MATCH_POSITION = 1;

export interface UseFindSearchMatchesProps {
  visibleColumns: string[];
  rows: DataTableRecord[];
  uiSearchTerm: string | undefined;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  scrollToFoundMatch: (params: {
    rowIndex: number;
    fieldName: string;
    matchIndex: number;
    shouldJump: boolean;
  }) => void;
}

export interface UseFindSearchMatchesReturn {
  matchesCount: number;
  activeMatchPosition: number;
  isProcessing: boolean;
  goToPrevMatch: () => void;
  goToNextMatch: () => void;
}

export const useFindSearchMatches = ({
  visibleColumns,
  rows,
  uiSearchTerm,
  dataView,
  fieldFormats,
  scrollToFoundMatch,
}: UseFindSearchMatchesProps): UseFindSearchMatchesReturn => {
  const [matchesMap, setMatchesMap] = useState<MatchesMap>(DEFAULT_MATCHES);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [activeMatchPosition, setActiveMatchPosition] = useState<number>(
    DEFAULT_ACTIVE_MATCH_POSITION
  );
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const scrollToMatch = useCallback(
    ({
      matchPosition,
      activeMatchesMap,
      activeColumns,
      shouldJump,
    }: {
      matchPosition: number;
      activeMatchesMap: MatchesMap;
      activeColumns: string[];
      shouldJump: boolean;
    }) => {
      const rowIndices = Object.keys(activeMatchesMap);
      let traversedMatchesCount = 0;

      for (const rowIndex of rowIndices) {
        const matchesPerFieldName = activeMatchesMap[Number(rowIndex)];
        const fieldNames = Object.keys(matchesPerFieldName);

        for (const fieldName of fieldNames) {
          const matchesCountForFieldName = matchesPerFieldName[fieldName];

          if (
            traversedMatchesCount < matchPosition &&
            traversedMatchesCount + matchesCountForFieldName >= matchPosition
          ) {
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
        activeMatchesMap: matchesMap,
        activeColumns: visibleColumns,
        shouldJump: true,
      });
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesMap, visibleColumns]);

  const goToNextMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (prev + 1 > matchesCount) {
        return prev;
      }
      const nextMatchPosition = prev + 1;
      scrollToMatch({
        matchPosition: nextMatchPosition,
        activeMatchesMap: matchesMap,
        activeColumns: visibleColumns,
        shouldJump: true,
      });
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesMap, visibleColumns, matchesCount]);

  useEffect(() => {
    if (!rows?.length || !uiSearchTerm?.length) {
      setMatchesMap(DEFAULT_MATCHES);
      setMatchesCount(0);
      setActiveMatchPosition(DEFAULT_ACTIVE_MATCH_POSITION);
      return;
    }

    setIsProcessing(true);
    const result: Record<number, Record<string, number>> = {};
    let totalMatchesCount = 0;
    rows.forEach((row, rowIndex) => {
      const matchesPerFieldName: Record<string, number> = {};
      const columns = visibleColumns.includes('_source')
        ? Object.keys(row.flattened)
        : visibleColumns;

      columns.forEach((fieldName) => {
        const formattedFieldValue = row.formatAndCacheFieldValue({
          fieldName,
          dataView,
          fieldFormats,
          uiSearchTerm,
        });

        const matchesCountForFieldName =
          row.findSearchMatchesInFormattedAndHighlightedValue(formattedFieldValue);

        if (matchesCountForFieldName) {
          matchesPerFieldName[fieldName] = matchesCountForFieldName;
          totalMatchesCount += matchesCountForFieldName;
        }
      });
      if (Object.keys(matchesPerFieldName).length) {
        result[rowIndex] = matchesPerFieldName;
      }
    });

    const nextMatchesMap = totalMatchesCount > 0 ? result : DEFAULT_MATCHES;
    const nextActiveMatchPosition = DEFAULT_ACTIVE_MATCH_POSITION;
    setMatchesMap(nextMatchesMap);
    setMatchesCount(totalMatchesCount);
    setActiveMatchPosition(nextActiveMatchPosition);
    setIsProcessing(false);

    if (totalMatchesCount > 0) {
      scrollToMatch({
        matchPosition: nextActiveMatchPosition,
        activeMatchesMap: nextMatchesMap,
        activeColumns: visibleColumns,
        shouldJump: false,
      });
    }
  }, [
    setMatchesMap,
    setMatchesCount,
    setActiveMatchPosition,
    setIsProcessing,
    scrollToMatch,
    visibleColumns,
    rows,
    uiSearchTerm,
    dataView,
    fieldFormats,
  ]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    isProcessing,
  };
};
