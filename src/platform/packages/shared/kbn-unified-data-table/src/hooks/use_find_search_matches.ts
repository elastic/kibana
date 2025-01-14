/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
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
}

export interface UseFindSearchMatchesReturn {
  matchesCount: number;
  isProcessing: boolean;
}

export const useFindSearchMatches = ({
  visibleColumns,
  rows,
  uiSearchTerm,
  dataView,
  fieldFormats,
}: UseFindSearchMatchesProps): UseFindSearchMatchesReturn => {
  const [matchesMap, setMatchesMap] = useState<MatchesMap>(DEFAULT_MATCHES);
  const [matchesCount, setMatchesCount] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!rows?.length || !uiSearchTerm?.length) {
      setMatchesMap(DEFAULT_MATCHES);
      setMatchesCount(0);
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
        });

        const matchesCountForFieldName = row.findSearchMatchesInFormattedValue({
          formattedFieldValue,
          uiSearchTerm,
        });

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
    setIsProcessing(false);
  }, [
    setMatchesMap,
    setMatchesCount,
    setIsProcessing,
    visibleColumns,
    rows,
    uiSearchTerm,
    dataView,
    fieldFormats,
  ]);

  return {
    matchesCount,
    isProcessing,
  };
};
