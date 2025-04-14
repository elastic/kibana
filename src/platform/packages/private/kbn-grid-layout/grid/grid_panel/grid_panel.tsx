/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, skip } from 'rxjs';
import deepEqual from 'fast-deep-equal';

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './grid_panel_resize_handle';
import { GridPanelData, GridRowData } from '../types';
import { getMainLayoutInOrder } from '../utils/resolve_grid_row';

export interface GridPanelProps {
  panelId: string;
  rowId: string;
}

export const GridPanel = React.memo(({ panelId, rowId }: GridPanelProps) => {
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();

  const { euiTheme } = useEuiTheme();
  const dragHandleApi = useDragHandleApi({ panelId, rowId });

  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  const initialStyles = useMemo(() => {
    const layout =
      gridLayoutStateManager.proposedGridLayout$.getValue() ??
      gridLayoutStateManager.gridLayout$.getValue();
    let initialPanel: GridPanelData;
    if (rowId === 'main') {
      initialPanel = layout[panelId] as GridPanelData;
    } else {
      initialPanel = (layout[rowId] as GridRowData)?.panels[panelId];
    }
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
      .kbnGridPanel--dragHandle,
      .kbnGridPanel--resizeHandle {
        touch-action: none; // prevent scrolling on touch devices
        scroll-margin-top: ${gridLayoutStateManager.runtimeSettings$.value.keyboardDragTopLimit}px;
      }
    `;
  }, [gridLayoutStateManager, rowId, panelId]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.panelRefs.current[rowId][panelId];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const previousSection = useMemo(() => {
  //   if(rowId !== 'main') return undefined;

  //   const test = getMainLayoutInOrder(gridLayoutStateManager.proposedGridLayout$ ??)
  //   return
  // }, [])

  useEffect(
    () => {
      const startingPanel = (() => {
        const layout =
          gridLayoutStateManager.gridLayout$.getValue() ??
          gridLayoutStateManager.proposedGridLayout$.getValue();
        if (rowId === 'main') {
          return layout[panelId] as GridPanelData;
        } else {
          return (layout[rowId] as GridRowData)?.panels[panelId];
        }
      })();
      const currentPanel$ = new BehaviorSubject<GridPanelData>(startingPanel);

      const currentPanelSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ])
        .pipe(
          map(([gridLayout, proposedGridLayout]) => {
            if (rowId === 'main') {
              return (proposedGridLayout ?? gridLayout)[panelId] as GridPanelData;
            } else {
              return ((proposedGridLayout ?? gridLayout)[rowId] as GridRowData)?.panels[panelId];
            }
          }),
          distinctUntilChanged(deepEqual)
        )
        .subscribe((panel) => {
          currentPanel$.next(panel);
        });

      /** Update the styles of the panel via a subscription to prevent re-renders */
      const activePanelStyleSubscription = combineLatest([
        gridLayoutStateManager.activePanel$,
        currentPanel$,
      ])
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe(([activePanel, currentPanel]) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowId][panelId];
          if (!ref || currentPanel.id !== panelId) return;

          const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();
          if (currentPanel.id === activePanel?.id) {
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
              ref.style.gridColumnStart = `${currentPanel.column + 1}`;
              ref.style.gridRowStart = `${currentPanel.row + 1}`;
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
            ref.style.height = `calc(1px * (${currentPanel.height} * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) - var(--kbnGridGutterSize)))`;

            // const previousSection = (() => {
            //   if (rowId !== 'main') return undefined;
            //   const test = getMainLayoutInOrder(proposedGridLayout ?? gridLayout);
            //   const panelIndex = test.findIndex((widget) => widget.id === panelId);
            //   if (panelIndex <= 0) return undefined;
            //   for (let i = panelIndex; i--; i >= 0) {
            //     if (test[i]?.type === 'section') return test[i].id;
            //   }
            //   return undefined;
            // })();

            // // and render the panel locked to the grid
            // const relativeRow = previousSection
            //   ? panel.row - (proposedGridLayout ?? gridLayout)[previousSection].row - 1
            //   : panel.row + 1;
            ref.style.gridColumnStart = `${currentPanel.column + 1}`;
            ref.style.gridColumnEnd = `span ${currentPanel.width}`;
            // ref.style.gridRowStart = `${
            //   previousSection ? `${previousSection}-end ` : ''
            // }${relativeRow}`;
            ref.style.gridRowStart = `${currentPanel.row + 1}`;
            ref.style.gridRowEnd = `span ${currentPanel.height}`;
          }
        });

      /**
       * This subscription adds and/or removes the necessary class name for expanded panel styling
       */
      const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
        (expandedPanelId) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowId][panelId];
          const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
          let panel: GridPanelData;
          if (rowId === 'main') {
            panel = gridLayout[panelId] as GridPanelData;
          } else {
            panel = (gridLayout[rowId] as GridRowData)?.panels[panelId];
          }
          if (!ref || !panel) return;

          if (expandedPanelId && expandedPanelId === panelId) {
            ref.classList.add('kbnGridPanel--expanded');
          } else {
            ref.classList.remove('kbnGridPanel--expanded');
          }
        }
      );

      return () => {
        currentPanelSubscription.unsubscribe();
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
        if (!gridLayoutStateManager.panelRefs.current[rowId]) {
          gridLayoutStateManager.panelRefs.current[rowId] = {};
        }
        gridLayoutStateManager.panelRefs.current[rowId][panelId] = element;
      }}
      css={initialStyles}
      className="kbnGridPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} rowId={rowId} />
    </div>
  );
});

GridPanel.displayName = 'KbnGridLayoutPanel';
