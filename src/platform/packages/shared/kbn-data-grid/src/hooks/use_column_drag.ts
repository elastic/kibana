/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PointerEvent as ReactPointerEvent, RefObject } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keys } from '@elastic/eui';
import { DATA_GRID_HEADER_ROW_CLASS } from '../constants';
import type { DataGridInternalColumn, DataGridProps } from '../types';

/** Pointer movement in pixels before pressing a header becomes a drag instead of a click. */
export const COLUMN_DRAG_THRESHOLD = 4;
/** Distance in pixels from the edge of the scrolling columns that scrolls them while dragging. */
const AUTO_SCROLL_EDGE = 40;
const AUTO_SCROLL_MAX_SPEED = 16;

export interface ColumnDragState {
  /** The column being dragged. */
  columnId: string;
  /** The column the dragged one would be dropped next to, and on which side. */
  dropColumnId: string;
  dropSide: 'before' | 'after';
}

interface DropTarget {
  dropColumnId: string;
  dropSide: 'before' | 'after';
  /** Index among the data columns before which the dragged column is inserted. */
  insertIndex: number;
}

interface UseColumnDragParams<TRow> {
  scrollRef: RefObject<HTMLElement | null>;
  columns: Array<DataGridInternalColumn<TRow>>;
  onReorderColumn: DataGridProps<TRow>['onReorderColumn'];
}

/**
 * Reordering the data columns by dragging their headers. The drop target follows the pointer over
 * the rendered headers, and the columns scroll when the pointer gets close to their edges.
 */
export const useColumnDrag = <TRow>({
  scrollRef,
  columns,
  onReorderColumn,
}: UseColumnDragParams<TRow>) => {
  const [dragState, setDragState] = useState<ColumnDragState>();
  const dataColumnIds = useMemo(
    () => columns.filter(({ isControl }) => !isControl).map(({ id }) => id),
    [columns]
  );
  // The listeners of a drag outlive the render that started it.
  const latestRef = useRef({ dataColumnIds, onReorderColumn });
  latestRef.current = { dataColumnIds, onReorderColumn };
  const stopDragRef = useRef<() => void>();
  useEffect(() => () => stopDragRef.current?.(), []);

  const getDropTarget = useCallback(
    (clientX: number): DropTarget | undefined => {
      const headerRow = scrollRef.current?.querySelector(`.${DATA_GRID_HEADER_ROW_CLASS}`);
      if (!headerRow) {
        return undefined;
      }
      const ids = latestRef.current.dataColumnIds;
      const headers = Array.from(
        headerRow.querySelectorAll<HTMLElement>('[role="columnheader"]')
      ).filter((header) => ids.includes(header.dataset.gridcellColumnId ?? ''));

      // Columns that scroll under the sticky ones are rendered but hidden: they are no target.
      const stickyEdges = headers.reduce(
        (edges, header) => {
          const { left, right } = header.getBoundingClientRect();
          if (header.dataset.stickySide === 'left') {
            return { ...edges, left: Math.max(edges.left, right) };
          }
          if (header.dataset.stickySide === 'right') {
            return { ...edges, right: Math.min(edges.right, left) };
          }
          return edges;
        },
        { left: -Infinity, right: Infinity }
      );
      const targets = headers
        .map((header) => ({
          id: header.dataset.gridcellColumnId ?? '',
          rect: header.getBoundingClientRect(),
          isSticky: header.dataset.stickySide !== undefined,
        }))
        .filter(({ rect, isSticky }) => {
          const center = rect.left + rect.width / 2;
          return isSticky || (center >= stickyEdges.left && center <= stickyEdges.right);
        })
        .sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));

      const before = targets.find(({ rect }) => clientX < rect.left + rect.width / 2);
      if (before) {
        return { dropColumnId: before.id, dropSide: 'before', insertIndex: ids.indexOf(before.id) };
      }
      const last = targets[targets.length - 1];
      return last
        ? { dropColumnId: last.id, dropSide: 'after', insertIndex: ids.indexOf(last.id) + 1 }
        : undefined;
    },
    [scrollRef]
  );

  const startDrag = useCallback(
    (columnId: string, event: ReactPointerEvent) => {
      // Touch pans the grid instead: keyboard and touch users move columns with the header actions.
      if (
        !onReorderColumn ||
        event.button !== 0 ||
        event.isPrimary === false ||
        event.pointerType === 'touch'
      ) {
        return;
      }
      stopDragRef.current?.();
      const startX = event.clientX;
      let pointerX = startX;
      let isDragging = false;
      let target: DropTarget | undefined;
      let scrollFrame: number | undefined;
      const previousUserSelect = document.body.style.userSelect;

      const updateTarget = () => {
        target = getDropTarget(pointerX);
        const next = target && {
          columnId,
          dropColumnId: target.dropColumnId,
          dropSide: target.dropSide,
        };
        setDragState((prev) =>
          prev?.dropColumnId === next?.dropColumnId && prev?.dropSide === next?.dropSide
            ? prev
            : next
        );
      };

      // Scrolls the columns while the pointer is close to the edges of the scrolling ones.
      const autoScroll = () => {
        scrollFrame = undefined;
        const element = scrollRef.current;
        if (!element || !isDragging) {
          return;
        }
        const { left, right } = element.getBoundingClientRect();
        const leftEdge = Array.from(
          element.querySelectorAll<HTMLElement>(
            `.${DATA_GRID_HEADER_ROW_CLASS} [data-sticky-side="left"]`
          )
        ).reduce((edge, header) => Math.max(edge, header.getBoundingClientRect().right), left);
        const rightEdge = Array.from(
          element.querySelectorAll<HTMLElement>(
            `.${DATA_GRID_HEADER_ROW_CLASS} [data-sticky-side="right"]`
          )
        ).reduce((edge, header) => Math.min(edge, header.getBoundingClientRect().left), right);
        const distance =
          pointerX < leftEdge + AUTO_SCROLL_EDGE
            ? pointerX - (leftEdge + AUTO_SCROLL_EDGE)
            : pointerX > rightEdge - AUTO_SCROLL_EDGE
            ? pointerX - (rightEdge - AUTO_SCROLL_EDGE)
            : 0;
        if (distance === 0) {
          return;
        }
        const speed =
          Math.sign(distance) *
          Math.min(AUTO_SCROLL_MAX_SPEED, Math.ceil(Math.abs(distance) / 2) + 1);
        element.scrollLeft += speed;
        updateTarget();
        scrollFrame = requestAnimationFrame(autoScroll);
      };

      const onMove = (moveEvent: PointerEvent) => {
        pointerX = moveEvent.clientX;
        if (!isDragging) {
          if (Math.abs(pointerX - startX) < COLUMN_DRAG_THRESHOLD) {
            return;
          }
          isDragging = true;
          document.body.style.userSelect = 'none';
          document.getSelection()?.removeAllRanges();
        }
        moveEvent.preventDefault();
        updateTarget();
        if (scrollFrame === undefined) {
          scrollFrame = requestAnimationFrame(autoScroll);
        }
      };

      // A drag ends with a click on the header, which would open its menu.
      const suppressClick = () => {
        const onClick = (clickEvent: MouseEvent) => {
          clickEvent.stopPropagation();
          clickEvent.preventDefault();
        };
        window.addEventListener('click', onClick, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', onClick, { capture: true }), 0);
      };

      const stop = () => {
        if (scrollFrame !== undefined) {
          cancelAnimationFrame(scrollFrame);
          scrollFrame = undefined;
        }
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', stop);
        document.removeEventListener('keydown', onKeyDown, true);
        if (isDragging) {
          document.body.style.userSelect = previousUserSelect;
        }
        stopDragRef.current = undefined;
        setDragState(undefined);
      };

      const onUp = () => {
        const wasDragging = isDragging;
        const dropTarget = target;
        stop();
        if (!wasDragging) {
          return;
        }
        suppressClick();
        const ids = latestRef.current.dataColumnIds;
        const fromIndex = ids.indexOf(columnId);
        if (!dropTarget || fromIndex < 0) {
          return;
        }
        const { insertIndex } = dropTarget;
        const toIndex = insertIndex > fromIndex ? insertIndex - 1 : insertIndex;
        if (toIndex !== fromIndex) {
          latestRef.current.onReorderColumn?.({ columnId, toIndex });
        }
      };

      const onKeyDown = (keyEvent: KeyboardEvent) => {
        if (isDragging && keyEvent.key === keys.ESCAPE) {
          keyEvent.preventDefault();
          keyEvent.stopPropagation();
          stop();
          suppressClick();
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', stop);
      document.addEventListener('keydown', onKeyDown, true);
      stopDragRef.current = stop;
    },
    [onReorderColumn, getDropTarget, scrollRef]
  );

  return { dragState, startDrag };
};
