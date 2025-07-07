/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef, useState, RefObject, useEffect } from 'react';
import { type EuiDataGridProps } from '@elastic/eui';
import { throttle } from 'lodash';
import { DataLoadingState, DataGridPaginationMode } from '../types';
import { useRestorableRef } from '../restorable_state';

const VIRTUALIZATION_OPTIONS: EuiDataGridProps['virtualizationOptions'] = {
  // Allowing some additional rows to be rendered outside
  // the view minimizes pop-in when scrolling quickly
  overscanRowCount: 20,
};

export interface UseVirtualizationProps {
  containerRef: RefObject<HTMLSpanElement>;
  loadingState: DataLoadingState;
  paginationMode: DataGridPaginationMode;
  defaultColumns: boolean;
}

export interface UseVirtualizationReturn {
  hasScrolledToBottom: boolean;
  virtualizationOptions: EuiDataGridProps['virtualizationOptions'];
}

export const useVirtualization = ({
  containerRef,
  loadingState,
  paginationMode,
  defaultColumns,
}: UseVirtualizationProps): UseVirtualizationReturn => {
  const loadingStateRef = useRef<DataLoadingState>(loadingState);
  loadingStateRef.current = loadingState;
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const hasScrolledToBottomRef = useRef<boolean>(hasScrolledToBottom);
  hasScrolledToBottomRef.current = hasScrolledToBottom;
  const scrollTopRef = useRestorableRef('scrollTop', 0);
  const scrollLeftRef = useRestorableRef('scrollLeft', 0);
  const isInitialScrollAppliedRef = useRef<boolean>(
    !scrollTopRef.current && !scrollLeftRef.current
  );

  const virtualizationOptions: EuiDataGridProps['virtualizationOptions'] = useMemo(() => {
    const options: EuiDataGridProps['virtualizationOptions'] = {
      onScroll: throttle((event: { scrollTop: number; scrollLeft: number }) => {
        if (loadingStateRef.current !== DataLoadingState.loaded) {
          return;
        }

        if (isInitialScrollAppliedRef.current) {
          scrollTopRef.current = event.scrollTop;
          scrollLeftRef.current = event.scrollLeft;
        } else if (event.scrollTop === 0 && event.scrollLeft === 0) {
          // onScroll is called right after the first render
          const rendered = Boolean(getVirtualizedElement(containerRef));

          if (rendered) {
            const initialScroll = { top: scrollTopRef.current, left: scrollLeftRef.current };
            requestAnimationFrame(() => {
              getVirtualizedElement(containerRef)?.scrollTo?.({
                ...initialScroll,
                behavior: 'instant',
              });
            });
            isInitialScrollAppliedRef.current = true;
          }
        }

        if (paginationMode === 'singlePage') {
          const prevHasScrolledToBottom = hasScrolledToBottomRef.current;

          // We need to manually query the react-window wrapper since EUI doesn't
          // expose outerRef in virtualizationOptions, but we should request it
          const outerRef = getVirtualizedElement(containerRef);

          if (!outerRef) {
            return;
          }

          // Account for footer height when it's visible to avoid flickering
          const scrollBottomMargin = prevHasScrolledToBottom ? 140 : 100;
          const isScrollable = outerRef.scrollHeight > outerRef.offsetHeight;
          const isScrolledToBottom =
            event.scrollTop + outerRef.offsetHeight >= outerRef.scrollHeight - scrollBottomMargin;

          const nextHasScrolledToBottom = isScrollable && isScrolledToBottom;

          if (nextHasScrolledToBottom !== prevHasScrolledToBottom) {
            setHasScrolledToBottom(nextHasScrolledToBottom);
          }
        }
      }, 200),
    };

    // Don't use row "overscan" when showing Summary column since
    // rendering so much DOM content in each cell impacts performance
    if (defaultColumns) {
      return options;
    }

    return {
      ...VIRTUALIZATION_OPTIONS,
      ...options,
    };
  }, [defaultColumns, loadingStateRef, paginationMode, scrollTopRef, scrollLeftRef, containerRef]);

  useEffect(() => {
    if (loadingState === DataLoadingState.loadingMore) {
      setHasScrolledToBottom(false);
    }
  }, [loadingState]);

  return {
    hasScrolledToBottom,
    virtualizationOptions,
  };
};

function getVirtualizedElement(containerRef: RefObject<HTMLSpanElement>): HTMLDivElement | null {
  return containerRef.current?.querySelector('.euiDataGrid__virtualized') ?? null;
}
