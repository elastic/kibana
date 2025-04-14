/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import classNames from 'classnames';
import React, { useEffect, useRef } from 'react';
import { combineLatest } from 'rxjs';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { COLLAPSIBLE_HEADER_HEIGHT, getTopOffsetForRow } from '../utils/calculations';
import { GridRowHeader } from './grid_row_header';

export interface GridRowHeaderProps {
  rowId: string;
  toggleIsCollapsed: (rowId: string) => void;
  collapseButtonRef: React.MutableRefObject<HTMLButtonElement | null>;
}

export const GridRowStartMark = React.memo(({ rowId }: { rowId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ]).subscribe(([gridLayout, proposedGridLayout]) => {
        const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
        if (!headerRef) return;
        const currentGridLayout = proposedGridLayout || gridLayout;
        const topOffset = getTopOffsetForRow(rowId, currentGridLayout);
        headerRef.style.display = 'block';
        headerRef.style.gridColumnStart = `1`;
        headerRef.style.gridColumnEnd = `-1`;
        headerRef.style.gridRowStart = `${topOffset + 1}`;
        headerRef.style.gridRowEnd = `${topOffset + 1 + COLLAPSIBLE_HEADER_HEIGHT}`;
      });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      style={{
        gridColumnStart: 1,
        gridColumnEnd: -1,
        gridRowStart: 1,
        gridRowEnd: 1,
        pointerEvents: 'none',
        height: '0px',
        background: '#f7f9fc',
      }}
      ref={(element: HTMLDivElement | null) => {
        gridLayoutStateManager.headerRefs.current[rowId] = element;
      }}
    />
  );
});

export const GridRowHeaderWrapper = ({
  rowId,
  toggleIsCollapsed,
  isCollapsed,
}: {
  rowId: string;
  toggleIsCollapsed: (rowId: string) => void;
  isCollapsed: boolean;
}) => {
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const { gridLayoutStateManager } = useGridLayoutContext();

  useEffect(() => {
    /**
     * Set `aria-expanded` without passing the expanded state as a prop to `GridRowHeader` in order
     * to prevent `GridRowHeader` from rerendering when this state changes
     */
    if (!collapseButtonRef.current) return;
    collapseButtonRef.current.ariaExpanded = `${!isCollapsed}`;
  }, [isCollapsed]);

  useEffect(
    () => {
      /** Update the styles of the drag preview via a subscription to prevent re-renders */
      const styleSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ]).subscribe(([gridLayout, proposedGridLayout]) => {
        const headerRef = gridLayoutStateManager.headerRefs.current[rowId];
        if (!headerRef) return;
        const currentGridLayout = proposedGridLayout || gridLayout;
        const topOffset = getTopOffsetForRow(rowId, currentGridLayout);
        headerRef.style.display = 'block';
        headerRef.style.gridColumnStart = `1`;
        headerRef.style.gridColumnEnd = `-1`;
        headerRef.style.gridRowStart = `${topOffset + 1}`;
        headerRef.style.gridRowEnd = `${topOffset + 1 + COLLAPSIBLE_HEADER_HEIGHT}`;
      });

      return () => {
        styleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <div
      className={classNames({ 'kbnGridRowHeader--collapsed': isCollapsed })}
      id={`kbnGridRow-${rowId}`}
      role="region"
      aria-labelledby={`kbnGridRowTitle-${rowId}`}
      ref={(element: HTMLDivElement | null) =>
        (gridLayoutStateManager.headerRefs.current[rowId] = element)
      }
    >
      <GridRowHeader
        rowId={rowId}
        toggleIsCollapsed={toggleIsCollapsed}
        collapseButtonRef={collapseButtonRef}
      />
    </div>
  );
};
