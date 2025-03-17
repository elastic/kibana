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

import { DragPreview } from '../drag_preview';
import { GridPanel } from '../grid_panel';
import { useGridLayoutContext } from '../use_grid_layout_context';
import { getPanelKeysInOrder } from '../utils/resolve_grid_row';
import { GridRowHeader } from './grid_row_header';

export interface GridRowProps {
  rowId: string;
}

export const GridRow = React.memo(({ rowId }: GridRowProps) => {
  const { gridLayoutStateManager } = useGridLayoutContext();
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null);
  const currentRow = gridLayoutStateManager.gridLayout$.value[rowId];

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
            return {
              isCollapsed: displayedGridLayout[rowId]?.isCollapsed ?? false,
              panelIds: Object.keys(displayedGridLayout[rowId]?.panels ?? {}),
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
                (gridLayoutStateManager.proposedGridLayout$.getValue() ??
                  gridLayoutStateManager.gridLayout$.getValue())[rowId]?.panels ?? {}
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
        const newPanelIdsInOrder = getPanelKeysInOrder(gridLayout[rowId].panels);
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
    newLayout[rowId].isCollapsed = !newLayout[rowId].isCollapsed;
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
      css={styles.fullHeight}
      className={classNames('kbnGridRowContainer', {
        'kbnGridRowContainer--collapsed': isCollapsed,
      })}
    >
      {currentRow.order !== 0 && (
        <GridRowHeader
          rowId={rowId}
          toggleIsCollapsed={toggleIsCollapsed}
          collapseButtonRef={collapseButtonRef}
        />
      )}
      {!isCollapsed && (
        <div
          id={`kbnGridRow-${rowId}`}
          className={'kbnGridRow'}
          ref={(element: HTMLDivElement | null) =>
            (gridLayoutStateManager.rowRefs.current[rowId] = element)
          }
          css={[styles.fullHeight, styles.grid]}
          role="region"
          aria-labelledby={`kbnGridRowTile-${rowId}`}
        >
          {/* render the panels **in order** for accessibility, using the memoized panel components */}
          {panelIdsInOrder.map((panelId) => (
            <GridPanel key={panelId} panelId={panelId} rowId={rowId} />
          ))}
          <DragPreview rowId={rowId} />
        </div>
      )}
    </div>
  );
});

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
};

GridRow.displayName = 'KbnGridLayoutRow';
