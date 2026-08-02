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
import type { DataGridPaginationMode } from '../types';

/**
 * Frames to keep retrying a scroll before giving up. On initial load the virtualized grid
 * renders well after the expanded document is known, so the first attempts have nothing to
 * scroll within.
 */
const MAX_SCROLL_ATTEMPTS = 60;

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

/**
 * Keeps the expanded document's row in view, so expanding a document always shows which row it
 * came from. This matters most when the document was not expanded by clicking its row, e.g. when
 * restoring one from a link or paginating within the doc viewer, in which case it can be on a
 * different page entirely.
 */
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
  const scrolledToDocId = useRef<string>();
  const isPaginated = paginationMode === 'multiPage' && isPaginationEnabled;

  // Read through a ref so retries in later frames see the committed page rather than the one
  // that was current when the attempt started
  const pageIndexRef = useRef(pageIndex);
  pageIndexRef.current = pageIndex;

  const centerExpandedRow = useCallback((): ScrollAttemptResult => {
    if (!expandedDoc) {
      return 'unavailable';
    }

    const rowIndex = displayedRows.findIndex(({ id }) => id === expandedDoc.id);

    // The document may not be part of the results, e.g. when restoring one from a link that the
    // current search does not return. It may still arrive in a later fetch, so this is not
    // treated as a failed attempt.
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

    // Only available once the virtualized grid body has rendered, which on initial load happens
    // well after the expanded document is known
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

    // Only scroll the first time a document becomes the expanded one, otherwise background
    // refetches would repeatedly pull the grid away from wherever the user scrolled to
    if (expandedDoc.id === scrolledToDocId.current) {
      return;
    }

    let frameId: number;
    let remainingAttempts = MAX_SCROLL_ATTEMPTS;

    const attemptScroll = () => {
      const result = centerExpandedRow();

      if (result === 'scrolled') {
        scrolledToDocId.current = expandedDoc.id;
      } else if (result === 'retry' && (remainingAttempts -= 1) > 0) {
        frameId = requestAnimationFrame(attemptScroll);
      }
    };

    frameId = requestAnimationFrame(attemptScroll);

    return () => cancelAnimationFrame(frameId);
  }, [centerExpandedRow, expandedDoc]);

  useEffect(() => {
    const scrollContainer = dataGridWrapper?.querySelector<HTMLElement>(VIRTUALIZED_SELECTOR);

    if (!scrollContainer || !expandedDoc) {
      return;
    }

    // Opening the doc viewer narrows the grid, which re-wraps rows into taller ones and moves the
    // expanded row back out of view, so re-center it once the new layout is in place
    let frameId: number;
    const observer = new ResizeObserver(() => {
      if (expandedDoc.id !== scrolledToDocId.current) {
        return;
      }

      cancelAnimationFrame(frameId);
      // Row heights are measured after the resize, so wait for that before re-centering
      frameId = requestAnimationFrame(centerExpandedRow);
    });

    observer.observe(scrollContainer);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
    };
  }, [centerExpandedRow, dataGridWrapper, expandedDoc]);
};
