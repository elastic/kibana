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
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { combineLatest, map, pairwise, skip } from 'rxjs';

import { css } from '@emotion/react';

import { GridPanelDragPreview } from '../grid_panel/grid_panel_drag_preview';
import { GridPanel } from '../grid_panel';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { GridRowHeader } from './grid_row_header';
import { getPanelKeysInOrder } from '../utils/resolve_grid_row';
import { GridRowData } from '../types';

export interface GridRowProps {
  rowId: string;
}

export const GridRow = React.memo(({ rowId }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentRow = gridLayoutStateManager.gridLayout$.value[rowId] as GridRowData;

  const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
    getPanelKeysInOrder(currentRow.panels)
  );
  const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const interactionStyleSubscription = gridLayoutStateManager.interactionEvent$
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe((interactionEvent) => {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowId];
          if (!rowRef) return;
          const targetRow = interactionEvent?.targetRow;
          if (rowId === targetRow && interactionEvent) {
            rowRef.classList.add('kbnGridRow--targeted');
          } else {
            rowRef.classList.remove('kbnGridRow--targeted');
          }
        });

      const rowCountSubscription = combineLatest([
        gridLayoutStateManager.proposedGridLayout$,
        gridLayoutStateManager.gridLayout$,
      ])
        .pipe(
          map(([proposedGridLayout, gridLayout]) => {
            const displayedGridLayout = proposedGridLayout ?? gridLayout;
            const row = displayedGridLayout[rowId] as GridRowData;
            if (row.isCollapsed) return 2;
            const panels = Object.values(row.panels);
            const maxRow =
              panels.length > 0 ? Math.max(...panels.map(({ row, height }) => row + height)) : 0;
            return maxRow + 2;
          })
        )
        .subscribe((rowCount) => {
          const layoutRef = gridLayoutStateManager.layoutRef.current;
          if (!layoutRef) return;
          layoutRef.style.setProperty(`--kbnGridRowCount-${rowId}`, `${rowCount}`);
        });

      /**
       * This subscription ensures that the row will re-render when one of the following changes:
       * - Collapsed state
       * - Panel IDs (adding/removing/replacing, but not reordering)
       */
      const rowStateSubscription = combineLatest([
        gridLayoutStateManager.proposedGridLayout$,
        gridLayoutStateManager.gridLayout$,
      ])
        .pipe(
          map(([proposedGridLayout, gridLayout]) => {
            const displayedGridLayout = proposedGridLayout ?? gridLayout;
            const displayedRow = displayedGridLayout[rowId] as GridRowData;
            return {
              isCollapsed: displayedRow?.isCollapsed ?? false,
              panelIds: Object.keys(displayedRow?.panels ?? {}),
            };
          }),
          pairwise()
        )
        .subscribe(([oldRowData, newRowData]) => {
          if (oldRowData.isCollapsed !== newRowData.isCollapsed) {
            setIsCollapsed(newRowData.isCollapsed);
          }
          if (
            oldRowData.panelIds.length !== newRowData.panelIds.length ||
            !(
              oldRowData.panelIds.every((p) => newRowData.panelIds.includes(p)) &&
              newRowData.panelIds.every((p) => oldRowData.panelIds.includes(p))
            )
          ) {
            setPanelIdsInOrder(
              getPanelKeysInOrder(
                (
                  (gridLayoutStateManager.proposedGridLayout$.getValue() ??
                    gridLayoutStateManager.gridLayout$.getValue())[rowId] as GridRowData
                )?.panels ?? {}
              )
            );
          }
        });

      /**
       * Ensure the row re-renders to reflect the new panel order after a drag-and-drop interaction, since
       * the order of rendered panels need to be aligned with how they are displayed in the grid for accessibility
       * reasons (screen readers and focus management).
       */
      const gridLayoutSubscription = gridLayoutStateManager.gridLayout$.subscribe((gridLayout) => {
        if (!gridLayout[rowId]) return;
        const newPanelIdsInOrder = getPanelKeysInOrder((gridLayout[rowId] as GridRowData).panels);
        if (panelIdsInOrder.join() !== newPanelIdsInOrder.join()) {
          setPanelIdsInOrder(newPanelIdsInOrder);
        }
      });

      return () => {
        interactionStyleSubscription.unsubscribe();
        gridLayoutSubscription.unsubscribe();
        rowStateSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rowId]
  );

  const toggleIsCollapsed = useCallback(() => {
    const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
    (newLayout[rowId] as GridRowData).isCollapsed = !(newLayout[rowId] as GridRowData).isCollapsed;
    gridLayoutStateManager.gridLayout$.next(newLayout);
  }, [rowId, gridLayoutStateManager.gridLayout$]);

  useEffect(() => {
    /**
     * Set `aria-expanded` without passing the expanded state as a prop to `GridRowHeader` in order
     * to prevent `GridRowHeader` from rerendering when this state changes
     */
    if (!collapseButtonRef.current) return;
    collapseButtonRef.current.ariaExpanded = `${!isCollapsed}`;
  }, [isCollapsed]);

  return (
    <div
      ref={(element: HTMLDivElement | null) =>
        (gridLayoutStateManager.rowContainerRefs.current[rowId] = element)
      }
      css={[
        styles.fullHeight,
        styles.gridWrapper,
        css({
          gridRowStart: `span ${rowId}-start` /** gridRowEnd: `span var(--kbnGridRowCount-${rowId})` */,
          gridRowEnd: `auto` /** gridRowEnd: `span var(--kbnGridRowCount-${rowId})` */,
          height: `calc((var(--kbnGridRowCount-${rowId}) * 20) + ((var(--kbnGridRowCount-${rowId}) - 2) * 8) * 1px)`,
        }),
      ]}
      className={classNames('kbnGridRowContainer', {
        'kbnGridRowContainer--collapsed': isCollapsed,
      })}
    >
      <GridRowHeader
        rowId={rowId}
        toggleIsCollapsed={toggleIsCollapsed}
        collapseButtonRef={collapseButtonRef}
      />
      {!isCollapsed && (
        <div
          id={`kbnGridRow-${rowId}`}
          className={'kbnGridRow'}
          ref={(element: HTMLDivElement | null) =>
            (gridLayoutStateManager.rowRefs.current[rowId] = element)
          }
          css={styles.grid}
          role="region"
          aria-labelledby={`kbnGridRowTitle-${rowId}`}
        >
          {/* render the panels **in order** for accessibility, using the memoized panel components */}
          {panelIdsInOrder.map((panelId) => (
            <GridPanel key={panelId} panelId={panelId} rowId={rowId} />
          ))}
          <GridPanelDragPreview rowId={rowId} />
        </div>
      )}
    </div>
  );
});

const styles = {
  fullHeight: css({
    height: '100%',
  }),
  gridWrapper: css({
    gridColumnStart: 1,
    gridColumnEnd: -1, // full width
    borderBottom: `1px solid #E3E8F2`,
    '& .kbnGridRow': { paddingBottom: '8px' },
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
};

GridRow.displayName = 'KbnGridLayoutRow';
