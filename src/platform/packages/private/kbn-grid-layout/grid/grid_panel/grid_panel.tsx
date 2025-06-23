/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { combineLatest, distinctUntilChanged, filter, map, pairwise, skip, startWith } from 'rxjs';

import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './grid_panel_resize_handle';
import { useGridPanelState } from './use_panel_grid_data';

export interface GridPanelProps {
  panelId: string;
}

export const GridPanel = React.memo(({ panelId }: GridPanelProps) => {
  const { euiTheme } = useEuiTheme();
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();
  const panel$ = useGridPanelState({ panelId });
  const [sectionId, setSectionId] = useState<string | undefined>(panel$.getValue()?.sectionId);
  const dragHandleApi = useDragHandleApi({ panelId, sectionId });

  const initialStyles = useMemo(() => {
    const initialPanel = panel$.getValue();
    if (!initialPanel) return;
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
      grid-row-start: ${`gridRow-${initialPanel.sectionId}`} ${initialPanel.row + 1};
      grid-row-end: span ${initialPanel.height};
      .kbnGridPanel--dragHandle,
      .kbnGridPanel--resizeHandle {
        touch-action: none; // prevent scrolling on touch devices
        scroll-margin-top: ${gridLayoutStateManager.runtimeSettings$.value.keyboardDragTopLimit}px;
      }
    `;
  }, [panel$, gridLayoutStateManager.runtimeSettings$]);

  useEffect(() => {
    return () => {
      // remove reference on unmount
      delete gridLayoutStateManager.panelRefs.current[panelId];
    };
  }, [panelId, gridLayoutStateManager]);

  useEffect(() => {
    /** Update the styles of the panel as it is dragged via a subscription to prevent re-renders */
    const activePanelStyleSubscription = combineLatest([
      gridLayoutStateManager.activePanelEvent$.pipe(
        // filter out the first active panel event to allow "onClick" events through
        pairwise(),
        filter(([before]) => before !== undefined),
        map(([, after]) => after),
        startWith(undefined)
      ),
      panel$,
    ])
      .pipe(skip(1))
      .subscribe(([activePanel, currentPanel]) => {
        if (!currentPanel) return;
        const ref = gridLayoutStateManager.panelRefs.current[currentPanel?.id];
        const isPanelActive = activePanel && activePanel.id === currentPanel?.id;
        if (!ref) return;

        if (isPanelActive) {
          // allow click events through before triggering active status
          ref.classList.add('kbnGridPanel--active');

          // if the current panel is active, give it fixed positioning depending on the interaction event
          const { position: draggingPosition } = activePanel;
          const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();

          ref.style.zIndex = `${euiTheme.levels.modal}`;
          if (activePanel.type === 'resize') {
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
            ref.style.gridRowStart = `${`gridRow-${currentPanel.sectionId}`} ${
              currentPanel.row + 1
            }`;
            ref.style.gridColumnEnd = `auto`;
            ref.style.gridRowEnd = `auto`;
          } else {
            // if the current panel is being dragged, render it with a fixed position + size
            ref.style.position = 'fixed';

            ref.style.left = `${draggingPosition.left}px`;
            ref.style.top = `${draggingPosition.top}px`;
            ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
            ref.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;
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

          // and render the panel locked to the grid
          ref.style.gridColumnStart = `${currentPanel.column + 1}`;
          ref.style.gridColumnEnd = `${currentPanel.column + 1 + currentPanel.width}`;
          ref.style.gridRowStart = `${`gridRow-${currentPanel.sectionId}`} ${currentPanel.row + 1}`;
          ref.style.gridRowEnd = `span ${currentPanel.height}`;
        }
      });

    /**
     * This subscription adds and/or removes the necessary class name for expanded panel styling
     */
    const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
      (expandedPanelId) => {
        const panel = panel$.getValue();
        if (!panel) return;
        const ref = gridLayoutStateManager.panelRefs.current[panel.id];
        if (!ref) return;
        if (expandedPanelId && expandedPanelId === panel.id) {
          ref.classList.add('kbnGridPanel--expanded');
        } else {
          ref.classList.remove('kbnGridPanel--expanded');
        }
      }
    );

    const sectionIdSubscription = panel$
      .pipe(
        skip(1),
        map((panel) => panel?.sectionId),
        distinctUntilChanged()
      )
      .subscribe((currentSection) => {
        setSectionId(currentSection);
      });

    return () => {
      activePanelStyleSubscription.unsubscribe();
      expandedPanelSubscription.unsubscribe();
      sectionIdSubscription.unsubscribe();
    };
  }, [panel$, gridLayoutStateManager, euiTheme.levels.modal]);

  /**
   * Memoize panel contents to prevent unnecessary re-renders
   */
  const panelContents = useMemo(() => {
    return renderPanelContents(panelId, dragHandleApi.setDragHandles);
  }, [panelId, renderPanelContents, dragHandleApi]);

  return (
    <div
      ref={(element) => {
        gridLayoutStateManager.panelRefs.current[panelId] = element;
      }}
      css={initialStyles}
      className="kbnGridPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} sectionId={sectionId} />
    </div>
  );
});

GridPanel.displayName = 'KbnGridLayoutPanel';
