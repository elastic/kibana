/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { combineLatest, skip } from 'rxjs';

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './resize_handle';

export interface GridPanelProps {
  panelId: string;
  rowIndex: number;
}

export const GridPanel = React.memo(({ panelId, rowIndex }: GridPanelProps) => {
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();

  const { euiTheme } = useEuiTheme();
  const dragHandleApi = useDragHandleApi({ panelId, rowIndex });

  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  const initialStyles = useMemo(() => {
    const initialPanel = (gridLayoutStateManager.proposedGridLayout$.getValue() ??
      gridLayoutStateManager.gridLayout$.getValue())[rowIndex].panels[panelId];
    return css`
      position: relative;
      height: calc(
        1px *
          (
            ${initialPanel.height} * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) -
              var(--kbnGridGutterSize)
          )
      );
      grid-column-start: ${initialPanel.column + 1};
      grid-column-end: ${initialPanel.column + 1 + initialPanel.width};
      grid-row-start: ${initialPanel.row + 1};
      grid-row-end: ${initialPanel.row + 1 + initialPanel.height};
    `;
  }, [gridLayoutStateManager, rowIndex, panelId]);

  useEffect(
    () => {
      /** Update the styles of the panel via a subscription to prevent re-renders */
      const activePanelStyleSubscription = combineLatest([
        gridLayoutStateManager.activePanel$,
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ])
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe(([activePanel, gridLayout, proposedGridLayout]) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
          const panel = (proposedGridLayout ?? gridLayout)[rowIndex].panels[panelId];
          if (!ref || !panel) return;

          const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();

          if (panelId === activePanel?.id) {
            ref.classList.add('kbnGridPanel--active');

            // if the current panel is active, give it fixed positioning depending on the interaction event
            const { position: draggingPosition } = activePanel;
            const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();

            ref.style.zIndex = `${euiTheme.levels.modal}`;
            if (currentInteractionEvent?.type === 'resize') {
              // if the current panel is being resized, ensure it is not shrunk past the size of a single cell
              ref.style.width = `${Math.max(
                draggingPosition.right - draggingPosition.left,
                runtimeSettings.columnPixelWidth
              )}px`;
              ref.style.height = `${Math.max(
                draggingPosition.bottom - draggingPosition.top,
                runtimeSettings.rowHeight
              )}px`;

              // undo any "lock to grid" styles **except** for the top left corner, which stays locked
              ref.style.gridColumnStart = `${panel.column + 1}`;
              ref.style.gridRowStart = `${panel.row + 1}`;
              ref.style.gridColumnEnd = `auto`;
              ref.style.gridRowEnd = `auto`;
            } else {
              // if the current panel is being dragged, render it with a fixed position + size
              ref.style.position = 'fixed';

              ref.style.left = `${draggingPosition.left}px`;
              ref.style.top = `${draggingPosition.top}px`;
              ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
              ref.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

              // undo any "lock to grid" styles
              ref.style.gridArea = `auto`; // shortcut to set all grid styles to `auto`
            }
          } else {
            ref.classList.remove('kbnGridPanel--active');

            ref.style.zIndex = `auto`;

            // if the panel is not being dragged and/or resized, undo any fixed position styles
            ref.style.position = '';
            ref.style.left = ``;
            ref.style.top = ``;
            ref.style.width = ``;
            // setting the height is necessary for mobile mode
            ref.style.height = `calc(1px * (${panel.height} * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) - var(--kbnGridGutterSize)))`;

            // and render the panel locked to the grid
            ref.style.gridColumnStart = `${panel.column + 1}`;
            ref.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            ref.style.gridRowStart = `${panel.row + 1}`;
            ref.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
          }
        });

      /**
       * This subscription adds and/or removes the necessary class name for expanded panel styling
       */
      const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
        (expandedPanelId) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
          const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
          const panel = gridLayout[rowIndex].panels[panelId];
          if (!ref || !panel) return;

          if (expandedPanelId && expandedPanelId === panelId) {
            ref.classList.add('kbnGridPanel--expanded');
          } else {
            ref.classList.remove('kbnGridPanel--expanded');
          }
        }
      );

      return () => {
        expandedPanelSubscription.unsubscribe();
        activePanelStyleSubscription.unsubscribe();
      };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  /**
   * Memoize panel contents to prevent unnecessary re-renders
   */
  const panelContents = useMemo(() => {
    return renderPanelContents(panelId, dragHandleApi.setDragHandles);
  }, [panelId, renderPanelContents, dragHandleApi]);

  return (
    <div
      ref={(element) => {
        if (!gridLayoutStateManager.panelRefs.current[rowIndex]) {
          gridLayoutStateManager.panelRefs.current[rowIndex] = {};
        }
        gridLayoutStateManager.panelRefs.current[rowIndex][panelId] = element;
      }}
      css={initialStyles}
      className="kbnGridPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} rowIndex={rowIndex} />
    </div>
  );
});

GridPanel.displayName = 'KbnGridLayoutPanel';
