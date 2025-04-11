/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import classNames from 'classnames';
import deepEqual from 'fast-deep-equal';
import { cloneDeep, isEqual } from 'lodash';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { combineLatest, pairwise, map, distinctUntilChanged } from 'rxjs';

import { css } from '@emotion/react';

import { GridHeightSmoother } from './grid_height_smoother';
import {
  GridAccessMode,
  GridLayoutData,
  GridLayoutStateManager,
  GridSettings,
  UseCustomDragHandle,
} from './types';
import { GridLayoutContext, GridLayoutContextType } from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { getPanelKeysInOrder, getRowKeysInOrder, resolveGridRow } from './utils/resolve_grid_row';
import { GridPanelDragPreview } from './grid_panel/grid_panel_drag_preview';
import { GridPanel } from './grid_panel';

import { GridRowDragPreview } from './grid_row/grid_row_drag_preview';
import { HeaderGhost, GridRowHeaderWrapper } from './grid_row/grid_row_header_wrapper';
import { GhostFooter } from './grid_row/grid_row_ghost';

export type GridLayoutProps = {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
} & UseCustomDragHandle;

type GridElementData = [string, string, boolean];

const getGridElementData = (
  gridLayoutStateManager: GridLayoutStateManager,
  layout?: GridLayoutData
) => {
     const currentLayout = layout ||
      gridLayoutStateManager.proposedGridLayout$.getValue() ||
      gridLayoutStateManager.gridLayout$.getValue();
  const rowIdsInOrder = getRowKeysInOrder(layout || currentLayout);
  const flattenedGridElements: GridElementData[] = rowIdsInOrder.flatMap((rowId) => {
 
    const row = currentLayout[rowId];
    const panels = row.panels;
    const panelIdsInOrder = getPanelKeysInOrder(panels);

    const headerElement: GridElementData = [
      row.order === 0 ? 'header-ghost' : 'header',
      rowId,
      row.isCollapsed,
    ];
    const footerElement: GridElementData = ['footer-ghost', rowId, row.isCollapsed];
    return [
      headerElement,
      ...panelIdsInOrder.map((panelId): GridElementData => [panelId, rowId, row.isCollapsed]),
      footerElement,
    ];
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
    getGridElementData(gridLayoutStateManager, layout)
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
          console.log('onLayoutChangeSubscription')
          if (!deepEqual(Object.keys(layoutBefore), Object.keys(layoutAfter))) {
            setGridElements(getGridElementData(gridLayoutStateManager));
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

  useEffect(
    () => {
      /**
       * This subscription ensures that the layout will re-render when one of the following changes:
       * - x - Collapsed state
       * - Panel IDs (adding/removing/replacing, but not reordering)
       */
      const gridStateSubscription = combineLatest([
        gridLayoutStateManager.proposedGridLayout$,
        gridLayoutStateManager.gridLayout$,
      ])
        .pipe(
          map(([proposedGridLayout, gridLayout]) => {
            const displayedGridLayout = proposedGridLayout ?? gridLayout;
            const flattenedPanelIds = Object.values(displayedGridLayout).flatMap((row) =>
              Object.keys(row.panels ?? {})
            );
            return flattenedPanelIds;
          }),
          pairwise()
        )
        .subscribe(([oldPanelIds, newPanelIds]) => {
          if (
            oldPanelIds.length !== newPanelIds.length ||
            !(
              oldPanelIds.every((p) => newPanelIds.includes(p)) &&
              newPanelIds.every((p) => oldPanelIds.includes(p))
            )
          ) {
            setGridElements(getGridElementData(gridLayoutStateManager));
          }
        });

      /** /**
       * This subscription ensures that the layout will re-render when one of the following changes:
       * - Collapsed state
       * This subscription ensures that rows get re-rendered when their orders change
       * - Ensure the row re-renders to reflect the new panel order after a drag-and-drop interaction, since
       * the order of rendered panels need to be aligned with how they are displayed in the grid for accessibility
       * reasons (screen readers and focus management).
       */
      const gridLayoutSubscription = gridLayoutStateManager.gridLayout$.subscribe((gridLayout) => {
        if (!gridLayout) return;
        const newGridElements = getGridElementData(gridLayoutStateManager);
        console.log('gridLayoutSubscription')
        if (gridElements.join() !== newGridElements.join()) {
          setGridElements(newGridElements);
        }
      });

      return () => {
        gridLayoutSubscription.unsubscribe();
        gridStateSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const toggleIsCollapsed = useCallback(
    (rowwId: string) => {
      const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
      newLayout[rowwId].isCollapsed = !newLayout[rowwId].isCollapsed;
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
                case 'header-ghost':
                  return <HeaderGhost key={typeId} rowId={rowId} />;
                case 'footer-ghost':
                  return <GhostFooter rowId={rowId} key={`${rowId}-footer`} />;
                default:
                  if (isCollapsed) {
                    return null;
                  }
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
