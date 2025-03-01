/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo, useState } from 'react';
import { combineLatest, skip } from 'rxjs';

import { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useGridLayoutContext } from '../use_grid_layout_context';
import { DefaultDragHandle } from './drag_handle/default_drag_handle';
import { useDragHandleApi } from './drag_handle/use_drag_handle_api';
import { ResizeHandle } from './resize_handle';
import { RotateHandle } from './rotate_handle';

export interface GridPanelProps {
  panelId: string;
  rowIndex: number;
}

export const GridPanel = React.memo(({ panelId, rowIndex }: GridPanelProps) => {
  const { gridLayoutStateManager, useCustomDragHandle, renderPanelContents } =
    useGridLayoutContext();

  const dragHandleApi = useDragHandleApi({ panelId, rowIndex });
  const [freeform, setFreeform] = useState<boolean>(
    gridLayoutStateManager.runtimeSettings$.getValue() === 'none'
  );

  /** Set initial styles based on state at mount to prevent styles from "blipping" */
  const initialStyles = useMemo(() => {
    const initialPanel = (gridLayoutStateManager.proposedGridLayout$.getValue() ??
      gridLayoutStateManager.gridLayout$.getValue())[rowIndex].panels[panelId];
    return css`
      --kbnGridPanelHeight: ${initialPanel.height};
      --kbnGridPanelWidth: ${initialPanel.width};
      --kbnGridPanelX: ${initialPanel.column};
      --kbnGridPanelY: ${initialPanel.row};
      --kbnGridPanelZ: ${initialPanel.zIndex ?? 1};
      --kbnGridPanelRotate: ${initialPanel.rotate ?? 0};
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

            if (currentInteractionEvent?.type === 'rotate') {
              ref.style.setProperty('--kbnGridPanelRotate', `${panel.rotate ?? 0}`);
            } else if (currentInteractionEvent?.type === 'resize') {
              // if the current panel is being resized, ensure it is not shrunk past the size of a single cell
              ref.classList.add('kbnGridPanel--resize');
              ref.style.setProperty(
                '--kbnGridPanelWidth',
                `${Math.max(
                  draggingPosition.right - draggingPosition.left,
                  runtimeSettings === 'none' ? 20 : runtimeSettings.columnPixelWidth
                )}`
              );
              ref.style.setProperty(
                '--kbnGridPanelHeight',
                `${Math.max(
                  draggingPosition.bottom - draggingPosition.top,
                  runtimeSettings === 'none' ? 20 : runtimeSettings.rowHeight
                )}`
              );
            } else {
              ref.classList.add('kbnGridPanel--drag');
              ref.style.setProperty(
                '--kbnGridPanelHeight',
                `${draggingPosition.bottom - draggingPosition.top}`
              );
              ref.style.setProperty(
                '--kbnGridPanelWidth',
                `${draggingPosition.right - draggingPosition.left}`
              );
              ref.style.setProperty('--kbnGridPanelX', `${draggingPosition.left}`);
              ref.style.setProperty('--kbnGridPanelY', `${draggingPosition.top}`);
            }
          } else {
            ref.classList.remove('kbnGridPanel--active');
            ref.classList.remove('kbnGridPanel--resize');
            ref.classList.remove('kbnGridPanel--drag');

            ref.style.setProperty('--kbnGridPanelWidth', `${panel.width}`);
            ref.style.setProperty('--kbnGridPanelHeight', `${panel.height}`);
            ref.style.setProperty('--kbnGridPanelX', `${Math.max(0, panel.column)}`);
            ref.style.setProperty('--kbnGridPanelY', `${Math.max(0, panel.row)}`);
            ref.style.setProperty('--kbnGridPanelZ', `${panel.zIndex ?? 1}`);
            ref.style.setProperty('--kbnGridPanelRotate', `${panel.rotate ?? 0}`);
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
      css={[initialStyles, panelStyles]}
      className="kbnGridPanel"
    >
      {!useCustomDragHandle && <DefaultDragHandle dragHandleApi={dragHandleApi} />}
      {panelContents}
      <ResizeHandle panelId={panelId} rowIndex={rowIndex} />
      {freeform && <RotateHandle panelId={panelId} rowIndex={rowIndex} />}
    </div>
  );
});

GridPanel.displayName = 'KbnGridLayoutPanel';

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
    '.kbnGrid--freeform &': {
      position: 'absolute',
      zIndex: 'var(--kbnGridPanelZ)',
      gridArea: 'auto', // shortcut to set all grid styles to `auto`
      left: 'calc(var(--kbnGridPanelX) * 1px)',
      top: 'calc(var(--kbnGridPanelY) * 1px)',
      width: `calc(1px * var(--kbnGridPanelWidth)) `,
      height: `calc(1px * var(--kbnGridPanelHeight)) `,
      transform: `rotate(calc(var(--kbnGridPanelRotate) * 1deg))`,
      transformOrigin: `50% -16px`,
      '.kbnGridPanel--rotateHandle': {
        opacity: '0',
      },
      '&:hover': {
        '.kbnGridPanel--rotateHandle': {
          opacity: '1',
        },
      },
    },
    '&.kbnGridPanel--active': {
      zIndex: euiTheme.levels.modal,
      width: `calc(1px * var(--kbnGridPanelWidth)) `,
      height: `calc(1px * var(--kbnGridPanelHeight)) `,
    },
    '&.kbnGridPanel--resize': {
      gridColumnEnd: `auto !important`,
      gridRowEnd: `auto !important`,
    },
    '&.kbnGridPanel--drag': {
      position: 'fixed',
      gridArea: 'auto', // shortcut to set all grid styles to `auto`
      left: 'calc(var(--kbnGridPanelX) * 1px)',
      top: 'calc(var(--kbnGridPanelY) * 1px)',
    },
  });
