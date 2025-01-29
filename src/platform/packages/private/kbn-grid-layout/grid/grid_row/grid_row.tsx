/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { map, pairwise, skip, combineLatest } from 'rxjs';
import { css } from '@emotion/react';

import { DragPreview } from '../drag_preview';
import { GridPanel } from '../grid_panel';
import { GridLayoutStateManager } from '../types';
import { getKeysInOrder } from '../utils/resolve_grid_row';
import { GridRowHeader } from './grid_row_header';

export interface GridRowProps {
  rowIndex: number;
  renderPanelContents: (
    panelId: string,
    setDragHandles?: (refs: Array<HTMLElement | null>) => void
  ) => React.ReactNode;
  gridLayoutStateManager: GridLayoutStateManager;
}

export const GridRow = ({
  rowIndex,
  renderPanelContents,
  gridLayoutStateManager,
}: GridRowProps) => {
  const currentRow = gridLayoutStateManager.gridLayout$.value[rowIndex];

  const [panelIds, setPanelIds] = useState<string[]>(Object.keys(currentRow.panels));
  const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
    getKeysInOrder(currentRow.panels)
  );
  const [rowTitle, setRowTitle] = useState<string>(currentRow.title);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  const initialStyles = useMemo(() => {
    const { columnCount } = gridLayoutStateManager.runtimeSettings$.getValue();
    return css`
      grid-auto-rows: calc(var(--kbnGridRowHeight) * 1px);
      grid-template-columns: repeat(
        ${columnCount},
        calc((100% - (var(--kbnGridGutterSize) * ${columnCount - 1}px)) / ${columnCount})
      );
      gap: calc(var(--kbnGridGutterSize) * 1px);
    `;
  }, [gridLayoutStateManager]);

  useEffect(
    () => {
      /** Update the styles of the grid row via a subscription to prevent re-renders */
      const interactionStyleSubscription = gridLayoutStateManager.interactionEvent$
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe((interactionEvent) => {
          const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];
          if (!rowRef) return;

          const targetRow = interactionEvent?.targetRowIndex;
          if (rowIndex === targetRow && interactionEvent) {
            rowRef.classList.add('kbnGridRow--targeted');
          } else {
            rowRef.classList.remove('kbnGridRow--targeted');
          }
        });

      /**
       * This subscription ensures that the row will re-render when one of the following changes:
       * - Title
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
              title: displayedGridLayout[rowIndex].title,
              isCollapsed: displayedGridLayout[rowIndex].isCollapsed,
              panelIds: Object.keys(displayedGridLayout[rowIndex].panels),
            };
          }),
          pairwise()
        )
        .subscribe(([oldRowData, newRowData]) => {
          if (oldRowData.title !== newRowData.title) setRowTitle(newRowData.title);
          if (oldRowData.isCollapsed !== newRowData.isCollapsed)
            setIsCollapsed(newRowData.isCollapsed);
          if (
            oldRowData.panelIds.length !== newRowData.panelIds.length ||
            !(
              oldRowData.panelIds.every((p) => newRowData.panelIds.includes(p)) &&
              newRowData.panelIds.every((p) => oldRowData.panelIds.includes(p))
            )
          ) {
            setPanelIds(newRowData.panelIds);
            setPanelIdsInOrder(
              getKeysInOrder(
                (gridLayoutStateManager.proposedGridLayout$.getValue() ??
                  gridLayoutStateManager.gridLayout$.getValue())[rowIndex].panels
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
        const newPanelIdsInOrder = getKeysInOrder(gridLayout[rowIndex].panels);
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
    [rowIndex]
  );

  /**
   * Memoize panel children components (independent of their order) to prevent unnecessary re-renders
   */
  const children: { [panelId: string]: React.ReactNode } = useMemo(() => {
    return panelIds.reduce(
      (prev, panelId) => ({
        ...prev,
        [panelId]: (
          <GridPanel
            key={panelId}
            panelId={panelId}
            rowIndex={rowIndex}
            gridLayoutStateManager={gridLayoutStateManager}
            renderPanelContents={renderPanelContents}
          />
        ),
      }),
      {}
    );
  }, [panelIds, gridLayoutStateManager, renderPanelContents, rowIndex]);

  return (
    <div
      css={css`
        height: 100%;
      `}
      className="kbnGridRowContainer"
    >
      {rowIndex !== 0 && (
        <GridRowHeader
          isCollapsed={isCollapsed}
          toggleIsCollapsed={() => {
            const newLayout = cloneDeep(gridLayoutStateManager.gridLayout$.value);
            newLayout[rowIndex].isCollapsed = !newLayout[rowIndex].isCollapsed;
            gridLayoutStateManager.gridLayout$.next(newLayout);
          }}
          rowTitle={rowTitle}
        />
      )}
      {!isCollapsed && (
        <div
          className={'kbnGridRow'}
          ref={(element: HTMLDivElement | null) =>
            (gridLayoutStateManager.rowRefs.current[rowIndex] = element)
          }
          css={css`
            height: 100%;
            display: grid;
            position: relative;
            justify-items: stretch;
            transition: background-color 300ms linear;
            ${initialStyles};
          `}
        >
          {/* render the panels **in order** for accessibility, using the memoized panel components */}
          {panelIdsInOrder.map((panelId) => children[panelId])}
          <DragPreview rowIndex={rowIndex} gridLayoutStateManager={gridLayoutStateManager} />
        </div>
      )}
    </div>
  );
};
