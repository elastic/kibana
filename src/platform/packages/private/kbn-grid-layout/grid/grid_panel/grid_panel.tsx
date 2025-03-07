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

import { CurrentEuiBreakpointContext, UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './resize_handle';

export interface GridPanelProps {
  panelId: string;
  rowId: string;
}

export const GridPanel = React.memo(({ panelId, rowId }: GridPanelProps) => {
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();

  const dragHandleApi = useDragHandleApi({ panelId, rowId });

  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  const initialStyles = useMemo(() => {
    const initialPanel = (gridLayoutStateManager.proposedGridLayout$.getValue() ??
      gridLayoutStateManager.gridLayout$.getValue())[rowId].panels[panelId];
    return css`
      --kbnGridPanelHeight: ${initialPanel.height};
      --kbnGridPanelWidth: ${initialPanel.width};
      --kbnGridPanelX: ${initialPanel.column};
      --kbnGridPanelY: ${initialPanel.row};
    `;
  }, [gridLayoutStateManager, rowId, panelId]);

  useEffect(
    () => {
      /** Update the styles of the panel via a subscription to prevent re-renders */
      const activePanelStyleSubscription = combineLatest([
        gridLayoutStateManager.interactionEvent$,
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.proposedGridLayout$,
      ])
        .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
        .subscribe(([currentInteractionEvent, gridLayout, proposedGridLayout]) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowId][panelId];
          const panel = (proposedGridLayout ?? gridLayout)[rowId]?.panels[panelId];
          if (!ref || !panel) return;

          if (panelId === currentInteractionEvent?.id) {
            ref.classList.add('kbnGridPanel--active');
            const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
            // ref.style.zIndex = `${euiTheme.levels.modal}`;

            if (currentInteractionEvent.type === 'init') {
              const { top, left, width, height } = currentInteractionEvent.startingRect;
              ref.style.setProperty('--kbnGridPanelTop', `${top}`);
              ref.style.setProperty('--kbnGridPanelLeft', `${left}`);
              ref.style.setProperty('--kbnGridPanelWidth', `${width}`);
              ref.style.setProperty('--kbnGridPanelHeight', `${height}`);
            } else {
              ref.style.setProperty(
                '--kbnGridPanelWidth',
                `${Math.max(
                  currentInteractionEvent.startingRect.width +
                    currentInteractionEvent.translateRect.width,
                  runtimeSettings.columnPixelWidth
                )}`
              );
              ref.style.setProperty(
                '--kbnGridPanelHeight',
                `${Math.max(
                  currentInteractionEvent.startingRect.height +
                    currentInteractionEvent.translateRect.height,
                  runtimeSettings.rowHeight
                )}`
              );

              if (currentInteractionEvent?.type === 'resize') {
                ref.classList.add('kbnGridPanel--resize');
              } else {
                ref.style.setProperty(
                  '--kbnGridPanelX',
                  `${
                    currentInteractionEvent.startingRect.left +
                    currentInteractionEvent.translateRect.left
                  }`
                );
                ref.style.setProperty(
                  '--kbnGridPanelY',
                  `${
                    currentInteractionEvent.startingRect.top +
                    currentInteractionEvent.translateRect.top
                  }`
                );
                ref.classList.add('kbnGridPanel--drag');
              }
            }
          } else {
            ref.classList.remove('kbnGridPanel--active');
            ref.classList.remove('kbnGridPanel--resize');
            ref.classList.remove('kbnGridPanel--drag');

            ref.style.setProperty('--kbnGridPanelWidth', `${panel.width}`);
            ref.style.setProperty('--kbnGridPanelHeight', `${panel.height}`);
            ref.style.setProperty('--kbnGridPanelX', `${Math.max(0, panel.column)}`);
            ref.style.setProperty('--kbnGridPanelY', `${Math.max(0, panel.row)}`);
          }
        });

      /**
       * This subscription adds and/or removes the necessary class name for expanded panel styling
       */
      const expandedPanelSubscription = gridLayoutStateManager.expandedPanelId$.subscribe(
        (expandedPanelId) => {
          const ref = gridLayoutStateManager.panelRefs.current[rowId][panelId];
          const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
          const panel = gridLayout[rowId].panels[panelId];
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
        if (!gridLayoutStateManager.panelRefs.current[rowId]) {
          gridLayoutStateManager.panelRefs.current[rowId] = {};
        }
        gridLayoutStateManager.panelRefs.current[rowId][panelId] = element;
      }}
      css={[initialStyles, panelStyles]}
      className="kbnGridPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} rowId={rowId} />
    </div>
  );
});

const panelStyles = ({ euiTheme }: UseEuiTheme) =>
  // @ts-ignore We are using a variable to set the z-index and it hates it
  css({
    position: 'relative',
    height: `calc(
    1px *
      (
        var(--kbnGridPanelHeight) * (var(--kbnGridRowHeight) + var(--kbnGridGutterSize)) -
          var(--kbnGridGutterSize)
      )
  )`,
    zIndex: 'auto',
    gridColumnStart: `calc(var(--kbnGridPanelX) + 1)`,
    gridColumnEnd: `calc(var(--kbnGridPanelX) + 1 + var(--kbnGridPanelWidth))`,
    gridRowStart: `calc(var(--kbnGridPanelY) + 1)`,
    gridRowEnd: `calc(var(--kbnGridPanelY) + 1 + var(--kbnGridPanelHeight))`,
    '&.kbnGridPanel--active': {
      zIndex: euiTheme.levels.modal,
      width: `calc(1px * var(--kbnGridPanelWidth)) `,
      height: `calc(1px * var(--kbnGridPanelHeight)) `,
    },
    '&.kbnGridPanel--drag': {
      position: 'fixed',
      gridArea: 'auto', // shortcut to set all grid styles to `auto`
      left: 'calc(var(--kbnGridPanelX) * 1px)',
      top: 'calc(var(--kbnGridPanelY) * 1px)',
    },
  });

GridPanel.displayName = 'KbnGridLayoutPanel';
