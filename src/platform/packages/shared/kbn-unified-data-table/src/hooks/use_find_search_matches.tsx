/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useState, ReactNode, useRef } from 'react';
import ReactDOM from 'react-dom';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { EuiDataGridCellValueElementProps } from '@elastic/eui';
import { escape } from 'lodash';

interface RowMatches {
  rowIndex: number;
  rowMatchesCount: number;
  matchesCountPerField: Record<string, number>;
}
const DEFAULT_MATCHES: RowMatches[] = [];
const DEFAULT_ACTIVE_MATCH_POSITION = 1;

export interface UseFindSearchMatchesProps {
  visibleColumns: string[];
  rows: DataTableRecord[] | undefined;
  uiSearchTerm: string | undefined;
  renderCellValue: (props: EuiDataGridCellValueElementProps) => ReactNode;
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
  renderCellValue,
  scrollToFoundMatch,
}: UseFindSearchMatchesProps): UseFindSearchMatchesReturn => {
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
    if (!rows?.length || !uiSearchTerm?.length) {
      setMatchesList(DEFAULT_MATCHES);
      setMatchesCount(0);
      setActiveMatchPosition(DEFAULT_ACTIVE_MATCH_POSITION);
      return;
    }

    setIsProcessing(true);

    const findMatches = async () => {
      const UnifiedDataTableRenderCellValue = renderCellValue;

      const result: RowMatches[] = [];
      let totalMatchesCount = 0;

      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const matchesCountPerField: Record<string, number> = {};
        let rowMatchesCount = 0;

        for (const fieldName of visibleColumns) {
          const formattedFieldValue = addSearchHighlights(
            await getCellHtmlPromise(
              <UnifiedDataTableRenderCellValue
                columnId={fieldName}
                rowIndex={rowIndex}
                isExpandable={false}
                isExpanded={false}
                isDetails={false}
                colIndex={0}
                setCellProps={() => {}}
              />
            ),
            uiSearchTerm
          );

          const matchesCountForFieldName =
            findSearchMatchesInFormattedAndHighlightedValue(formattedFieldValue);

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
    uiSearchTerm,
  ]);

  return {
    matchesCount,
    activeMatchPosition,
    goToPrevMatch,
    goToNextMatch,
    isProcessing,
  };
};

function getCellHtmlPromise(cell: ReactNode): Promise<string> {
  const container = document.createElement('div');
  return new Promise((resolve) => {
    ReactDOM.render(
      <GetHtmlWrapper
        onReady={(html) => {
          resolve(html);
          ReactDOM.unmountComponentAtNode(container);
        }}
      >
        {cell}
      </GetHtmlWrapper>,
      container
    );
  });
}

function GetHtmlWrapper({
  onReady,
  children,
}: {
  children: ReactNode;
  onReady: (html: string) => void;
}) {
  const cellValueRef = useRef<HTMLDivElement | null>(null);
  const processedRef = useRef<boolean>(false);

  useEffect(() => {
    if (!processedRef.current) {
      processedRef.current = true;
      onReady(cellValueRef.current?.innerHTML || '');
    }
  }, [onReady]);

  return <div ref={cellValueRef}>{children}</div>;
}

function getSearchTermRegExp(searchTerm: string): RegExp {
  return new RegExp(`(${escape(searchTerm)})`, 'gi');
}

export function modifyDOMAndAddSearchHighlights(originalNode: Node, uiSearchTerm: string) {
  let matchIndex = 0;
  const searchTermRegExp = getSearchTermRegExp(uiSearchTerm);

  function insertSearchHighlights(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(insertSearchHighlights);
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const nodeWithText = node as Text;
      const parts = (nodeWithText.textContent || '').split(searchTermRegExp);

      if (parts.length > 1) {
        const nodeWithHighlights = document.createDocumentFragment();

        parts.forEach((part) => {
          if (searchTermRegExp.test(part)) {
            const mark = document.createElement('mark');
            mark.textContent = part;
            mark.setAttribute('class', 'unifiedDataTable__findMatch');
            mark.setAttribute('data-match-index', `${matchIndex++}`);
            nodeWithHighlights.appendChild(mark);
          } else {
            nodeWithHighlights.appendChild(document.createTextNode(part));
          }
        });

        nodeWithText.replaceWith(nodeWithHighlights);
      }
    }
  }

  Array.from(originalNode.childNodes).forEach(insertSearchHighlights);
}

export function addSearchHighlights(
  formattedFieldValueAsHtml: string,
  uiSearchTerm: string
): string {
  if (!uiSearchTerm) return formattedFieldValueAsHtml;

  const parser = new DOMParser();
  const result = parser.parseFromString(formattedFieldValueAsHtml, 'text/html');

  modifyDOMAndAddSearchHighlights(result.body, uiSearchTerm);

  return result.body.innerHTML;
}

function findSearchMatchesInFormattedAndHighlightedValue(value: string): number {
  return (value.match(new RegExp('mark class="unifiedDataTable__findMatch"', 'gi')) || []).length;
}
