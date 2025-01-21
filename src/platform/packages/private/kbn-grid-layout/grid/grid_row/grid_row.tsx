/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { cloneDeep } from 'lodash';
import React, { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, map, pairwise, skip } from 'rxjs';

import { transparentize, useEuiTheme } from '@elastic/eui';
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

export const GridRow = forwardRef<HTMLDivElement, GridRowProps>(
  ({ rowIndex, renderPanelContents, gridLayoutStateManager }, gridRef) => {
    const currentRow = gridLayoutStateManager.gridLayout$.value[rowIndex];

    const [panelIds, setPanelIds] = useState<string[]>(Object.keys(currentRow.panels));
    const [panelIdsInOrder, setPanelIdsInOrder] = useState<string[]>(() =>
      getKeysInOrder(currentRow.panels)
    );
    const [rowTitle, setRowTitle] = useState<string>(currentRow.title);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

    const { euiTheme } = useEuiTheme();

    const rowContainer = useRef<HTMLDivElement | null>(null);

    /** Set initial styles based on state at mount to prevent styles from "blipping" */
    const initialStyles = useMemo(() => {
      const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
      const { columnCount, rowHeight } = runtimeSettings;

      return css`
        grid-auto-rows: ${rowHeight}px;
        grid-template-columns: repeat(${columnCount}, minmax(0, 1fr));
        gap: calc(var(--kbnGridGutterSize) * 1px);
      `;
    }, [gridLayoutStateManager]);

    useEffect(
      () => {
        /** Update the styles of the grid row via a subscription to prevent re-renders */
        const interactionStyleSubscription = combineLatest([
          gridLayoutStateManager.interactionEvent$,
          gridLayoutStateManager.runtimeSettings$,
          gridLayoutStateManager.gridLayout$,
        ])
          .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
          .subscribe(([interactionEvent, runtimeSettings]) => {
            const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];
            if (!rowRef) return;

            const { gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

            const targetRow = interactionEvent?.targetRowIndex;
            if (rowIndex === targetRow && interactionEvent) {
              // apply "targetted row" styles
              const gridColor = euiTheme.colors.backgroundLightAccentSecondary;
              rowRef.style.backgroundPosition = `top -${gutterSize / 2}px left -${
                gutterSize / 2
              }px`;
              rowRef.style.backgroundSize = ` ${columnPixelWidth + gutterSize}px ${
                rowHeight + gutterSize
              }px`;
              rowRef.style.backgroundImage = `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`;
              rowRef.style.backgroundColor = `${transparentize(
                euiTheme.colors.backgroundLightAccentSecondary,
                0.25
              )}`;
            } else {
              // undo any "targetted row" styles
              rowRef.style.backgroundPosition = ``;
              rowRef.style.backgroundSize = ``;
              rowRef.style.backgroundImage = ``;
              rowRef.style.backgroundColor = `transparent`;
            }
          });

        /**
         * This subscription ensures that the row will re-render when one of the following changes:
         * - Title
         * - Collapsed state
         * - Panel IDs (adding/removing/replacing, but not reordering)
         */
        const rowStateSubscription = gridLayoutStateManager.gridLayout$
          .pipe(
            map((gridLayout) => {
              return {
                title: gridLayout[rowIndex].title,
                isCollapsed: gridLayout[rowIndex].isCollapsed,
                panelIds: Object.keys(gridLayout[rowIndex].panels),
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
                getKeysInOrder(gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels)
              );
            }
          });

        /**
         * Ensure the row re-renders to reflect the new panel order after a drag-and-drop interaction, since
         * the order of rendered panels need to be aligned with how they are displayed in the grid for accessibility
         * reasons (screen readers and focus management).
         */
        const stableGridLayoutSubscription = gridLayoutStateManager.stableGridLayout$.subscribe(
          (stableGridLayout) => {
            const newPanelIdsInOrder = getKeysInOrder(stableGridLayout[rowIndex].panels);
            if (panelIdsInOrder.join() !== newPanelIdsInOrder.join()) {
              setPanelIdsInOrder(newPanelIdsInOrder);
            }
          }
        );

        return () => {
          interactionStyleSubscription.unsubscribe();
          stableGridLayoutSubscription.unsubscribe();
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
              ref={(element) => {
                if (!gridLayoutStateManager.panelRefs.current[rowIndex]) {
                  gridLayoutStateManager.panelRefs.current[rowIndex] = {};
                }
                gridLayoutStateManager.panelRefs.current[rowIndex][panelId] = element;
              }}
            />
          ),
        }),
        {}
      );
    }, [panelIds, gridLayoutStateManager, renderPanelContents, rowIndex]);

    return (
      <div
        ref={rowContainer}
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
            ref={gridRef}
            css={css`
              height: 100%;
              display: grid;
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
  }
);
