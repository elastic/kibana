/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AllCellsProps, RowMatches } from '../types';

const TIMEOUT_PER_ROW = 2000; // 2 sec per row max

// Renders all cells in the row and counts matches in each cell and the row in total.
export function RowCellsRenderer({
  rowIndex,
  inTableSearchTerm,
  visibleColumns,
  renderCellValue,
  onRowProcessed,
}: Omit<AllCellsProps, 'rowsCount' | 'onFinish'> & {
  rowIndex: number;
  onRowProcessed: (rowMatch: RowMatches) => void;
}) {
  const RenderCellValue = renderCellValue;
  const timerRef = useRef<NodeJS.Timeout>();
  const matchesCountPerColumnIdRef = useRef<Record<string, number>>({});
  const rowMatchesCountRef = useRef<number>(0);
  const remainingNumberOfResultsRef = useRef<number>(visibleColumns.length);
  const hasCompletedRef = useRef<boolean>(false);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  // all cells in the row were processed
  const onComplete = useCallback(() => {
    if (hasCompletedRef.current) {
      return;
    }
    hasCompletedRef.current = true; // report only once
    onRowProcessed({
      rowIndex,
      rowMatchesCount: rowMatchesCountRef.current,
      matchesCountPerColumnId: matchesCountPerColumnIdRef.current,
    });
  }, [rowIndex, onRowProcessed]);
  const onCompleteRef = useRef<() => void>();
  onCompleteRef.current = onComplete;

  // cell was rendered and matches count was calculated
  const onCellProcessed = useCallback(
    (columnId: string, count: number) => {
      remainingNumberOfResultsRef.current = remainingNumberOfResultsRef.current - 1;

      if (count > 0) {
        matchesCountPerColumnIdRef.current[columnId] = count;
        rowMatchesCountRef.current += count;
      }

      if (remainingNumberOfResultsRef.current === 0) {
        onComplete();
      }
    },
    [onComplete]
  );

  // don't let it run longer than TIMEOUT_PER_ROW
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onCompleteRef.current?.(); // at least report back the already collected results
      setHasTimedOut(true);
    }, TIMEOUT_PER_ROW);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [rowIndex, setHasTimedOut]);

  if (hasTimedOut) {
    // stop any further processing
    return null;
  }

  return (
    <>
      {visibleColumns.map((columnId, colIndex) => {
        return (
          <ErrorBoundary
            key={`${rowIndex}-${columnId}`}
            onError={() => {
              onCellProcessed(columnId, 0);
            }}
          >
            <RenderCellValue
              columnId={columnId}
              rowIndex={rowIndex}
              isExpandable={false}
              isExpanded={false}
              isDetails={false}
              colIndex={colIndex}
              setCellProps={setCellProps}
              inTableSearchTerm={inTableSearchTerm}
              onHighlightsCountFound={(count) => {
                // you can comment out the next line to observe that the row timeout is working as expected.
                onCellProcessed(columnId, count);
              }}
            />
          </ErrorBoundary>
        );
      })}
    </>
  );
}

/**
 * Renders nothing instead of a component which triggered an exception.
 */
class ErrorBoundary extends React.Component<
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

function setCellProps() {
  // nothing to do here
}
