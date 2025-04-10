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
import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { combineLatest, pairwise, map, distinctUntilChanged } from 'rxjs';

import { css } from '@emotion/react';

import { GridHeightSmoother } from './grid_height_smoother';
import { GridAccessMode, GridLayoutData, GridSettings, UseCustomDragHandle } from './types';
import {
  GridLayoutContext,
  GridLayoutContextType,
  useGridLayoutContext,
} from './use_grid_layout_context';
import { useGridLayoutState } from './use_grid_layout_state';
import { isLayoutEqual } from './utils/equality_checks';
import { getPanelKeysInOrder, getRowKeysInOrder, resolveGridRow } from './utils/resolve_grid_row';
import { GridRowHeader } from './grid_row/grid_row_header';
import { GridPanelDragPreview } from './grid_panel/grid_panel_drag_preview';
import { GridPanel } from './grid_panel';
import { getTopOffsetForRow, getTopOffsetForRowFooter } from './utils/calculations';

export type GridLayoutProps = {
  layout: GridLayoutData;
  gridSettings: GridSettings;
  onLayoutChange: (newLayout: GridLayoutData) => void;
  expandedPanelId?: string;
  accessMode?: GridAccessMode;
  className?: string; // this makes it so that custom CSS can be passed via Emotion
} & UseCustomDragHandle;

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

  const rows = gridLayoutStateManager.gridLayout$.value;

  const [rowIdsInOrder, setRowIdsInOrder] = useState<string[]>(getRowKeysInOrder(layout));

  // TODO: move this to state so the updates are not so frequent
  const headersAndPanelsIds = rowIdsInOrder.flatMap((rowId) => {
    const headerAndPanels = [];
    const row = rows[rowId];
    const panels = row.panels;
    const panelIdsInOrder = getPanelKeysInOrder(panels);
    if (row.order === 0) {
      headerAndPanels.push(['header-ghost', rowId, row.isCollapsed]);
    } else {
      headerAndPanels.push(['header', rowId, row.isCollapsed]);
    }
    return [
      ...headerAndPanels,
      ...panelIdsInOrder.map((panelId) => [panelId, rowId, row.isCollapsed]),
      ['footer-ghost', rowId, row.isCollapsed],
    ];
  });

  //  const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
  //   getPanelKeysInOrder(rows[rowIdsInOrder[0]].panels)
  // );
  // const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

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

          if (!deepEqual(Object.keys(layoutBefore), Object.keys(layoutAfter))) {
            setRowIdsInOrder(getRowKeysInOrder(layoutAfter));
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
     * This subscription ensures that rows get re-rendered when their orders change
     */
    const rowOrderSubscription = combineLatest([
      gridLayoutStateManager.proposedGridLayout$,
      gridLayoutStateManager.gridLayout$,
    ])
      .pipe(
        map(([proposedGridLayout, gridLayout]) =>
          getRowKeysInOrder(proposedGridLayout ?? gridLayout)
        ),
        distinctUntilChanged(deepEqual)
      )
      .subscribe((rowKeys) => {
        setRowIdsInOrder(rowKeys);
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
      rowOrderSubscription.unsubscribe();
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
        layoutRef.current.classList.remove('kbnGridLayout--active'); // todo: fix how these styles display for header - should they be visible for the whole page till the bottom?
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
        <div css={[styles.layoutPadding, styles.fullHeight]}>
          <div
            ref={(divElement) => {
              layoutRef.current = divElement;
              setDimensionsRef(divElement);
            }}
            className={classNames('kbnGrid', className)}
            css={[
              styles.hasActivePanel,
              styles.singleColumn,
              styles.hasExpandedPanel,
              styles.fullHeight,
              styles.grid,
            ]}
          >
            {headersAndPanelsIds.map(([typeId, rowId, isCollapsed]) => {
              // todo: fix types
              if (typeId === 'header') {
                return (
                  <GridRowHeaderWrapper
                    rowId={rowId}
                    toggleIsCollapsed={toggleIsCollapsed}
                    key={rowId}
                    isCollapsed={!!isCollapsed}
                  />
                );
              } else if (typeId === 'header-ghost') {
                return (
                  <div
                    key={typeId}
                    className="kbnGridRowHeader--ghost" // this used only for calculating the position of the row
                    style={{
                      gridColumnStart: 1,
                      gridColumnEnd: -1,
                      gridRowStart: 1,
                      gridRowEnd: 1,
                      pointerEvents: 'none',
                      height: '0px',
                    }}
                    ref={(element: HTMLDivElement | null) => {
                      gridLayoutStateManager.headerRefs.current[rowId] = element;
                    }}
                  />
                );
              } else if (typeId === 'footer-ghost') {
                return <GhostFooter rowId={rowId} key={`${rowId}-footer`} />;
              }
              if (!isCollapsed) {
                return <GridPanel key={typeId} panelId={typeId} rowId={rowId} />;
              }
              return null;
            })}
            <GridPanelDragPreview />
          </div>
        </div>
      </GridHeightSmoother>
    </GridLayoutContext.Provider>
  );
};

const GhostFooter = ({ rowId }: { rowId: string }) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
  const topOffset = getTopOffsetForRowFooter(rowId, gridLayout);
  const styles = {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    gridRowStart: topOffset + 1,
    gridRowEnd: topOffset + 3,
    pointerEvents: 'none' as const,
    height: '0px',
  };
  return (
    <div
      style={styles}
      className="kbnGridRowFooter--ghost"
      ref={(element: HTMLDivElement | null) =>
        (gridLayoutStateManager.footerRefs.current[rowId] = element)
      }
    /> // this used only for calculating the position of the row
  );
};

const GridRowHeaderWrapper = ({
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

  // memoization here causes that the layout doesn't refresh when another row is collapsed, but we have to find a performant way of memoizing it

  // const styles = useMemo(() => {
  const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
  const topOffset = getTopOffsetForRow(rowId, gridLayout);
  const styles = {
    gridColumnStart: 1,
    gridColumnEnd: -1,
    gridRowStart: topOffset + 1,
    gridRowEnd: topOffset + 3,
  };

  // }, [gridLayoutStateManager]);

  return (
    <div
      className={classNames({ 'kbnGridRowHeader--collapsed': isCollapsed })}
      style={styles}
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
    '&:has(.kbnGridPanel--expanded)': {
      height: '100%',
      display: 'block',
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
