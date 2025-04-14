/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import classNames from 'classnames';
import { cloneDeep } from 'lodash';
import { css } from '@emotion/react';
import { combineLatest, pairwise } from 'rxjs';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridAccessMode, GridLayoutData, GridSettings, UseCustomDragHandle } from './types';
import { GridLayoutContext, GridLayoutContextType } from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { getPanelKeysInOrder, getRowKeysInOrder, resolveGridRow } from './utils/resolve_grid_row';
import { GridPanelDragPreview } from './grid_panel/grid_panel_drag_preview';
import { GridPanel } from './grid_panel';

import { GridRowDragPreview } from './grid_row/grid_row_drag_preview';
import { GridRowHeaderEmpty, GridRowHeaderWrapper } from './grid_row/grid_row_header_wrapper';
import { GridRowVisualContainer } from './grid_row/grid_row_visual_container';

export type GridLayoutProps = {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
} & UseCustomDragHandle;

type GridElementData = [string, string, boolean];

const getGridsElementData = (layout: GridLayoutData) => {
  const rowIdsInOrder = getRowKeysInOrder(layout);
  const flattenedGridElements: GridElementData[] = rowIdsInOrder.flatMap((rowId) => {
    const row = layout[rowId];
    const panelIdsInOrder = getPanelKeysInOrder(row.panels);
    const startMark: GridElementData = [
      row.isCollapsible ? 'header' : 'row-start-mark',
      rowId,
      row.isCollapsed,
    ];
    const panelElements = row.isCollapsed
      ? []
      : panelIdsInOrder.map((panelId): GridElementData => [panelId, rowId, row.isCollapsed]);
    const rowGhost: GridElementData[] = row.isCollapsed
      ? []
      : [['row-ghost', rowId, row.isCollapsed]];

    return [...rowGhost, startMark, ...panelElements];
  });
  return flattenedGridElements;
};

export const GridLayout = ({
  layout,
  gridSettings,
  renderPanelContents,
  onLayoutChange,
  expandedPanelId,
  accessMode = 'EDIT',
  className,
  useCustomDragHandle = false,
}: GridLayoutProps) => {
  const layoutRef = useRef<HTMLDivElement | null>(null);
  const { gridLayoutStateManager, setDimensionsRef } = useGridLayoutState({
    layout,
    layoutRef,
    gridSettings,
    expandedPanelId,
    accessMode,
  });

  // offset layout vs saved layout (?)
  // we'd have an object here withz

  const [gridElements, setGridElements] = useState<GridElementData[]>(() =>
    getGridsElementData(layout)
  );
  // we use ref because subscription is inside of the stable useEffect so the state would be stale
  const gridElementsRef = useRef(gridElements);
  // Keep ref in sync with state
  useEffect(() => {
    gridElementsRef.current = gridElements;
  }, [gridElements]);

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
      Object.entries(newLayout).forEach(([rowId, row]) => {
        newLayout[rowId] = resolveGridRow(row);
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
     * This subscription calls the passed `onLayoutChange` callback when the layout changes;
     * if the row IDs have changed, it also sets `rowIdsInOrder` to trigger a re-render
     */
    const onLayoutChangeSubscription = gridLayoutStateManager.gridLayout$
      .pipe(pairwise())
      .subscribe(([layoutBefore, layoutAfter]) => {
        if (!isLayoutEqual(layoutBefore, layoutAfter)) {
          onLayoutChange(layoutAfter);
          const newGridElements = getGridsElementData(layoutAfter);
          if (gridElementsRef.current.join() !== newGridElements.join()) {
            setGridElements(newGridElements);
          }
        }
      });

    return () => {
      onLayoutChangeSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onLayoutChange]);

  useEffect(() => {
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
      gridLayoutClassSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const memoizedContext = useMemo(
    () =>
      ({
        renderPanelContents,
        useCustomDragHandle,
        gridLayoutStateManager,
      } as GridLayoutContextType),
    [renderPanelContents, useCustomDragHandle, gridLayoutStateManager]
  );

  useEffect(() => {
    /**
     * When the user is interacting with an element, the page can grow, but it cannot
     * shrink. This is to stop a behaviour where the page would scroll up automatically
     * making the panel shrink or grow unpredictably.
     */
    const interactionStyleSubscription = combineLatest([
      gridLayoutStateManager.interactionEvent$,
    ]).subscribe(([interactionEvent]) => {
      if (!layoutRef.current || gridLayoutStateManager.expandedPanelId$.getValue()) return;
      if (!interactionEvent) {
        layoutRef.current.classList.remove('kbnGridLayout--active');
        return;
      }
      layoutRef.current.classList.add('kbnGridLayout--active');
    });

    return () => {
      interactionStyleSubscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleIsCollapsed = useCallback(
    (rId: string) => {
      const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
      newLayout[rId].isCollapsed = !newLayout[rId].isCollapsed;
      gridLayoutStateManager.gridLayout$.next(newLayout);
    },
    [gridLayoutStateManager.gridLayout$]
  );

  return (
    <GridLayoutContext.Provider value={memoizedContext}>
      <GridHeightSmoother>
        <div css={[styles.layoutPadding, styles.hasExpandedPanel]}>
          <div
            ref={(divElement) => {
              layoutRef.current = divElement;
              setDimensionsRef(divElement);
            }}
            className={classNames('kbnGrid', className)}
            css={[styles.hasActivePanel, styles.singleColumn, styles.fullHeight, styles.grid]}
          >
            {gridElements.map(([typeId, rowId, isCollapsed]) => {
              switch (typeId) {
                case 'header':
                  return (
                    <GridRowHeaderWrapper
                      key={rowId}
                      rowId={rowId}
                      toggleIsCollapsed={toggleIsCollapsed}
                      isCollapsed={!!isCollapsed}
                    />
                  );
                case 'row-start-mark':
                  return <GridRowHeaderEmpty key={`${rowId}-${typeId}`} rowId={rowId} />;
                case 'row-ghost':
                  return <GridRowVisualContainer rowId={rowId} key={`${rowId}-${typeId}`} />;
                default:
                  return <GridPanel key={typeId} panelId={typeId} rowId={rowId} />;
              }
            })}
            <GridPanelDragPreview />
            <GridRowDragPreview />
          </div>
        </div>
      </GridHeightSmoother>
    </GridLayoutContext.Provider>
  );
};

const styles = {
  fullHeight: css({
    height: '100%',
  }),
  grid: css({
    position: 'relative',
    justifyItems: 'stretch',
    display: 'grid',
    gap: 'calc(var(--kbnGridGutterSize) * 1px)',
    gridAutoRows: 'calc(var(--kbnGridRowHeight) * 1px)',
    gridTemplateColumns: `repeat(
          var(--kbnGridColumnCount),
          calc(
            (100% - (var(--kbnGridGutterSize) * (var(--kbnGridColumnCount) - 1) * 1px)) /
              var(--kbnGridColumnCount)
          )
        )`,
  }),
  layoutPadding: css({
    padding: 'calc(var(--kbnGridGutterSize) * 1px)',
  }),
  hasActivePanel: css({
    '&:has(.kbnGridPanel--active), &:has(.kbnGridRowHeader--active)': {
      // disable pointer events and user select on drag + resize
      userSelect: 'none',
      pointerEvents: 'none',
    },
  }),
  singleColumn: css({
    '&.kbnGrid--mobileView': {
      '.kbnGridRow': {
        gridTemplateColumns: '100%',
        gridTemplateRows: 'auto',
        gridAutoFlow: 'row',
        gridAutoRows: 'auto',
      },
      '.kbnGridPanel': {
        gridArea: 'unset !important',
      },
    },
  }),
  hasExpandedPanel: css({
    ':has(.kbnGridPanel--expanded)': {
      height: '100%',
      '.kbnGrid': {
        display: 'block',
        height: '100%',
      },
      '.kbnGridRowHeader': {
        height: '0px', // used instead of 'display: none' due to a11y concerns
        padding: '0px',
        display: 'block',
        overflow: 'hidden',
      },
      '.kbnGridPanel': {
        '&.kbnGridPanel--expanded': {
          height: '100% !important',
        },
        // hide the non-expanded panels
        '&:not(.kbnGridPanel--expanded)': {
          position: 'absolute',
          top: '-9999px',
          left: '-9999px',
          visibility: 'hidden', // remove hidden panels and their contents from tab order for a11y
        },
      },
    },
  }),
};
