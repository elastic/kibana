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

export interface UseFindSearchMatchesProps {
  visibleColumns: string[];
  rows: DataTableRecord[];
  uiSearchTerm: string | undefined;
  dataView: DataView;
  fieldFormats: FieldFormatsStart;
  scrollToRow: (rowIndex: number) => void;
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
  scrollToRow,
}: UseFindSearchMatchesProps): UseFindSearchMatchesReturn => {
  const [matchesMap, setMatchesMap] = useState<MatchesMap>(DEFAULT_MATCHES);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [activeMatchPosition, setActiveMatchPosition] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!rows?.length || !uiSearchTerm?.length) {
      setMatchesMap(DEFAULT_MATCHES);
      setMatchesCount(0);
      setActiveMatchPosition(1);
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

    setMatchesMap(totalMatchesCount > 0 ? result : DEFAULT_MATCHES);
    setMatchesCount(totalMatchesCount);
    setActiveMatchPosition(1);
    setIsProcessing(false);
  }, [
    setMatchesMap,
    setMatchesCount,
    setActiveMatchPosition,
    setIsProcessing,
    visibleColumns,
    rows,
    uiSearchTerm,
    dataView,
    fieldFormats,
  ]);

  const scrollToMatch = useCallback(
    (matchPosition: number) => {
      const rowIndices = Object.keys(matchesMap);
      let traversedMatchesCount = 0;

      for (const rowIndex of rowIndices) {
        const matchesPerFieldName = matchesMap[Number(rowIndex)];
        const fieldNames = Object.keys(matchesPerFieldName);

        for (const fieldName of fieldNames) {
          const matchesCountForFieldName = matchesPerFieldName[fieldName];

          if (
            traversedMatchesCount < matchPosition &&
            traversedMatchesCount + matchesCountForFieldName >= matchPosition
          ) {
            scrollToRow(Number(rowIndex));
            return;
          }

          traversedMatchesCount += matchesCountForFieldName;
        }
      }
    },
    [matchesMap, scrollToRow]
  );

  const goToPrevMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (prev - 1 < 1) {
        return prev;
      }
      const nextMatchPosition = prev - 1;
      scrollToMatch(nextMatchPosition);
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch]);

  const goToNextMatch = useCallback(() => {
    setActiveMatchPosition((prev) => {
      if (prev + 1 > matchesCount) {
        return prev;
      }
      const nextMatchPosition = prev + 1;
      scrollToMatch(nextMatchPosition);
      return nextMatchPosition;
    });
  }, [setActiveMatchPosition, scrollToMatch, matchesCount]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    isProcessing,
  };
};
