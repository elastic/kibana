/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { EuiDataGridRefProps } from '@elastic/eui';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { VIRTUALIZED_SELECTOR } from '../constants';
import { useRestorableRef } from '../restorable_state';
import type { DataGridPaginationMode } from '../types';

/** Retry while the virtualized grid renders after the expanded document is known. */
const MAX_SCROLL_ATTEMPTS = 60;

/** Keep the row centered only while the doc viewer reflows the grid. */
const SCROLL_SETTLE_DURATION = 500;

type ScrollAttemptResult =
  /** The row was brought into view */
  | 'scrolled'
  /** The grid is not ready yet, or is on the wrong page */
  | 'retry'
  /** There is no row to scroll to, e.g. the document is not part of the results */
  | 'unavailable';

export interface UseScrollToExpandedDocProps {
  expandedDoc: DataTableRecord | undefined;
  displayedRows: DataTableRecord[];
  paginationMode: DataGridPaginationMode;
  isPaginationEnabled: boolean;
  pageIndex: number;
  pageSize: number;
  onChangePageIndex: (pageIndex: number) => void;
  dataGridRef: RefObject<EuiDataGridRefProps>;
  dataGridWrapper: HTMLElement | null;
}

/** Keeps the expanded document's row visible when opening links or paginating the doc viewer. */
export const useScrollToExpandedDoc = ({
  expandedDoc,
  displayedRows,
  paginationMode,
  isPaginationEnabled,
  pageIndex,
  pageSize,
  onChangePageIndex,
  dataGridRef,
  dataGridWrapper,
}: UseScrollToExpandedDocProps) => {
  const scrolledToDocId = useRestorableRef('scrolledToExpandedDocId', undefined);
  const isPaginated = paginationMode === 'multiPage' && isPaginationEnabled;

  // Let later retries see the committed page rather than the page where scrolling started.
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;

  const centerExpandedRow = useCallback((): ScrollAttemptResult => {
    if (!expandedDoc) {
      return 'unavailable';
    }

    const rowIndex = displayedRows.findIndex(({ id }) => id === expandedDoc.id);

    // A linked document may arrive in a later results fetch, so do not treat absence as failure.
    if (rowIndex === -1) {
      return 'unavailable';
    }

    if (isPaginated) {
      const targetPageIndex = Math.floor(rowIndex / pageSize);

      if (targetPageIndex !== pageIndexRef.current) {
        // The rows for the target page have not rendered yet, so retry once they have
        onChangePageIndex(targetPageIndex);
        return 'retry';
      }
    }

    if (!dataGridRef.current?.scrollToItem) {
      return 'retry';
    }

    dataGridRef.current.scrollToItem({
      rowIndex: isPaginated ? rowIndex % pageSize : rowIndex,
      align: 'center',
    });

    return 'scrolled';
  }, [dataGridRef, displayedRows, expandedDoc, isPaginated, onChangePageIndex, pageSize]);

  useEffect(() => {
    if (!expandedDoc) {
      scrolledToDocId.current = undefined;
      return;
    }

    // Do not let background refetches pull the grid away from the user's scroll position.
    if (expandedDoc.id === scrolledToDocId.current) {
      return;
    }

    let frameId: number;
    let settleTimeoutId: ReturnType<typeof setTimeout>;
    let observer: ResizeObserver | undefined;
    let remainingAttempts = MAX_SCROLL_ATTEMPTS;

    const stop = () => {
      cancelAnimationFrame(frameId);
      clearTimeout(settleTimeoutId);
      observer?.disconnect();
    };

    // Hold the row through the doc viewer reflow, but do not react to later user resizes.
    const holdRowCenteredWhileSettling = () => {
      const scrollContainer = dataGridWrapper?.querySelector<HTMLElement>(VIRTUALIZED_SELECTOR);

      if (!scrollContainer) {
        return;
      }

      observer = new ResizeObserver(() => {
        cancelAnimationFrame(frameId);
        // Re-center after the grid measures its new row heights.
        frameId = requestAnimationFrame(centerExpandedRow);
      });

      observer.observe(scrollContainer);
      settleTimeoutId = setTimeout(stop, SCROLL_SETTLE_DURATION);
    };

    const attemptScroll = () => {
      const result = centerExpandedRow();

      if (result === 'scrolled') {
        scrolledToDocId.current = expandedDoc.id;
        holdRowCenteredWhileSettling();
      } else if (result === 'retry' && (remainingAttempts -= 1) > 0) {
        frameId = requestAnimationFrame(attemptScroll);
      }
    };

    frameId = requestAnimationFrame(attemptScroll);

    return stop;
  }, [centerExpandedRow, dataGridWrapper, expandedDoc, scrolledToDocId]);
};
