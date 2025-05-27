/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, distinctUntilChanged, map, pairwise, skip } from 'rxjs';

import { css } from '@emotion/react';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridRow } from './grid_row';
import { GridAccessMode, GridLayoutData, GridSettings } from './types';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { resolveGridRow } from './utils/resolve_grid_row';

export interface GridLayoutProps {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  renderPanelContents: (
    panelId: string,
    setDragHandles?: (refs: Array<HTMLElement | null>) => void
  ) => React.ReactNode;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
}

export const GridLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  expandedPanelId,
  accessMode = 'EDIT',
  className,
}: GridLayoutProps) => {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    layoutRef,
    gridSettings,
    expandedPanelId,
    accessMode,
  });

  const [rowCount, setRowCount] = useState<number>(
    gridLayoutStateManager.gridLayout$.getValue().length
  );

  /**
   * Update the `gridLayout$` behaviour subject in response to the `layout` prop changing
   */
  useEffect(() => {
    if (!isLayoutEqual(layout, gridLayoutStateManager.gridLayout$.getValue())) {
      const newLayout = cloneDeep(layout);
      /**
       * the layout sent in as a prop is not guaranteed to be valid (i.e it may have floating panels) -
       * so, we need to loop through each row and ensure it is compacted
       */
      newLayout.forEach((row, rowIndex) => {
        newLayout[rowIndex] = resolveGridRow(row);
      });
      gridLayoutStateManager.gridLayout$.next(newLayout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  /**
   * Set up subscriptions
   */
  useEffect(() => {
    /**
     * This subscription calls the passed `onLayoutChange` callback when the layout changes
     */
    const onLayoutChangeSubscription = gridLayoutStateManager.gridLayout$
      .pipe(pairwise())
      .subscribe(([layoutBefore, layoutAfter]) => {
        if (!isLayoutEqual(layoutBefore, layoutAfter)) {
          onLayoutChange(layoutAfter);
        }
      });

    return () => {
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLayoutChange]);

  useEffect(() => {
    /**
     * The only thing that should cause the entire layout to re-render is adding a new row;
     * this subscription ensures this by updating the `rowCount` state when it changes.
     */
    const rowCountSubscription = gridLayoutStateManager.gridLayout$
      .pipe(
        skip(1), // we initialized `rowCount` above, so skip the initial emit
        map((newLayout) => newLayout.length),
        distinctUntilChanged()
      )
      .subscribe((newRowCount) => {
        setRowCount(newRowCount);
      });

    /**
     * This subscription adds and/or removes the necessary class names related to styling for
     * mobile view and a static (non-interactable) grid layout
     */
    const gridLayoutClassSubscription = combineLatest([
      gridLayoutStateManager.accessMode$,
      gridLayoutStateManager.isMobileView$,
    ]).subscribe(([currentAccessMode, isMobileView]) => {
      if (!layoutRef) return;

      if (isMobileView) {
        layoutRef.current?.classList.add('kbnGrid--mobileView');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--mobileView');
      }

      if (currentAccessMode === 'VIEW') {
        layoutRef.current?.classList.add('kbnGrid--static');
      } else {
        layoutRef.current?.classList.remove('kbnGrid--static');
      }
    });

    return () => {
      rowCountSubscription.unsubscribe();
      gridLayoutClassSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Memoize row children components to prevent unnecessary re-renders
   */
  const children = useMemo(() => {
    return Array.from({ length: rowCount }, (_, rowIndex) => {
      return (
        <GridRow
          key={rowIndex}
          rowIndex={rowIndex}
          renderPanelContents={renderPanelContents}
          gridLayoutStateManager={gridLayoutStateManager}
        />
      );
    });
  }, [rowCount, gridLayoutStateManager, renderPanelContents]);

  return (
    <GridHeightSmoother gridLayoutStateManager={gridLayoutStateManager}>
      <div
        ref={(divElement) => {
          layoutRef.current = divElement;
          setDimensionsRef(divElement);
        }}
        className={classNames('kbnGrid', className)}
        css={css`
          padding: calc(var(--kbnGridGutterSize) * 1px);

          // disable pointer events and user select on drag + resize
          &:has(.kbnGridPanel--active) {
            user-select: none;
            pointer-events: none;
          }

          &:has(.kbnGridPanel--expanded) {
            ${expandedPanelStyles}
          }
          &.kbnGrid--mobileView {
            ${singleColumnStyles}
          }
        `}
      >
        {children}
      </div>
    </GridHeightSmoother>
  );
};

const singleColumnStyles = css`
  .kbnGridRow {
    grid-template-columns: 100%;
    grid-template-rows: auto;
    grid-auto-flow: row;
    grid-auto-rows: auto;
  }

  .kbnGridPanel {
    grid-area: unset !important;
  }
`;

const expandedPanelStyles = css`
  height: 100%;

  & .kbnGridRowContainer:has(.kbnGridPanel--expanded) {
    // targets the grid row container that contains the expanded panel
    .kbnGridRowHeader {
      height: 0px; // used instead of 'display: none' due to a11y concerns
    }
    .kbnGridRow {
      display: block !important; // overwrite grid display
      height: 100%;
      .kbnGridPanel {
        &.kbnGridPanel--expanded {
          height: 100% !important;
        }
        &:not(.kbnGridPanel--expanded) {
          // hide the non-expanded panels
          position: absolute;
          top: -9999px;
          left: -9999px;
          visibility: hidden; // remove hidden panels and their contents from tab order for a11y
        }
      }
    }
  }

  & .kbnGridRowContainer:not(:has(.kbnGridPanel--expanded)) {
    // targets the grid row containers that **do not** contain the expanded panel
    position: absolute;
    top: -9999px;
    left: -9999px;
  }
`;
