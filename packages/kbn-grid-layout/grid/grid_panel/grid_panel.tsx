/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useEffect, useMemo } from 'react';
import { combineLatest, skip } from 'rxjs';

import { EuiPanel, euiFullHeight, useEuiOverflowScroll } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { GridLayoutStateManager, PanelInteractionEvent } from '../types';
import { getKeysInOrder } from '../utils/resolve_grid_row';
import { DragHandle } from './drag_handle';
import { ResizeHandle } from './resize_handle';

export interface GridPanelProps {
  panelId: string;
  rowIndex: number;
  renderPanelContents: (panelId: string) => React.ReactNode;
  interactionStart: (
    type: PanelInteractionEvent['type'] | 'drop',
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>
  ) => void;
  gridLayoutStateManager: GridLayoutStateManager;
}

export const GridPanel = forwardRef<HTMLDivElement, GridPanelProps>(
  (
    { panelId, rowIndex, renderPanelContents, interactionStart, gridLayoutStateManager },
    panelRef
  ) => {
    /** Set initial styles based on state at mount to prevent styles from "blipping" */
    const initialStyles = useMemo(() => {
      const initialPanel = gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels[panelId];
      return css`
        grid-column-start: ${initialPanel.column + 1};
        grid-column-end: ${initialPanel.column + 1 + initialPanel.width};
        grid-row-start: ${initialPanel.row + 1};
        grid-row-end: ${initialPanel.row + 1 + initialPanel.height};
        &.kbnGridPanel--isExpanded {
          transform: translate(9999px, 9999px);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }
      `;
    }, [gridLayoutStateManager, rowIndex, panelId]);

    useEffect(
      () => {
        /** Update the styles of the panel via a subscription to prevent re-renders */
        const activePanelStyleSubscription = combineLatest([
          gridLayoutStateManager.activePanel$,
          gridLayoutStateManager.gridLayout$,
          gridLayoutStateManager.runtimeSettings$,
        ])
          .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
          .subscribe(([activePanel, gridLayout, runtimeSettings]) => {
            const ref = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
            const panel = gridLayout[rowIndex].panels[panelId];
            if (!ref || !panel) return;

            const currentInteractionEvent = gridLayoutStateManager.interactionEvent$.getValue();

            if (panelId === activePanel?.id) {
              // if the current panel is active, give it fixed positioning depending on the interaction event
              const { position: draggingPosition } = activePanel;

              ref.style.zIndex = `${euiThemeVars.euiZModal}`;
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
                ref.style.gridColumnEnd = ``;
                ref.style.gridRowEnd = ``;
              } else {
                // if the current panel is being dragged, render it with a fixed position + size
                ref.style.position = `fixed`;
                ref.style.left = `${draggingPosition.left}px`;
                ref.style.top = `${draggingPosition.top}px`;
                ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
                ref.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

                // undo any "lock to grid" styles
                ref.style.gridColumnStart = ``;
                ref.style.gridRowStart = ``;
                ref.style.gridColumnEnd = ``;
                ref.style.gridRowEnd = ``;
              }
            } else {
              ref.style.zIndex = '0';

              // if the panel is not being dragged and/or resized, undo any fixed position styles
              ref.style.position = '';
              ref.style.left = ``;
              ref.style.top = ``;
              ref.style.width = ``;
              ref.style.height = ``;

              // and render the panel locked to the grid
              ref.style.gridColumnStart = `${panel.column + 1}`;
              ref.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
              ref.style.gridRowStart = `${panel.row + 1}`;
              ref.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
            }
          });

        const expandedPanelStyleSubscription = gridLayoutStateManager.expandedPanelId$
          .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
          .subscribe((expandedPanelId) => {
            const ref = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
            const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
            const panel = gridLayout[rowIndex].panels[panelId];
            if (!ref || !panel) return;

            if (expandedPanelId && expandedPanelId === panelId) {
              ref.classList.add('kbnGridPanel--isExpanded');
            } else {
              ref.classList.remove('kbnGridPanel--isExpanded');
            }
          });

        const mobileViewStyleSubscription = gridLayoutStateManager.isMobileView$
          .pipe(skip(1))
          .subscribe((isMobileView) => {
            if (!isMobileView) {
              return;
            }
            const ref = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
            const gridLayout = gridLayoutStateManager.gridLayout$.getValue();
            const allPanels = gridLayout[rowIndex].panels;
            const panel = allPanels[panelId];
            if (!ref || !panel) return;

            const sortedKeys = getKeysInOrder(gridLayout[rowIndex].panels);
            const currentPanelPosition = sortedKeys.indexOf(panelId);
            const sortedKeysBefore = sortedKeys.slice(0, currentPanelPosition);
            const responsiveGridRowStart = sortedKeysBefore.reduce(
              (acc, key) => acc + allPanels[key].height,
              1
            );
            ref.style.gridColumnStart = `1`;
            ref.style.gridColumnEnd = `-1`;
            ref.style.gridRowStart = `${responsiveGridRowStart}`;
            ref.style.gridRowEnd = `${responsiveGridRowStart + panel.height}`;
          });

        return () => {
          expandedPanelStyleSubscription.unsubscribe();
          mobileViewStyleSubscription.unsubscribe();
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
      return renderPanelContents(panelId);
    }, [panelId, renderPanelContents]);

    return (
      <div ref={panelRef} css={initialStyles} className="kbnGridPanel">
        <EuiPanel
          hasShadow={false}
          hasBorder={true}
          css={css`
            padding: 0;
            position: relative;
            height: 100%;
          `}
        >
          <DragHandle interactionStart={interactionStart} />
          <div
            css={css`
              ${euiFullHeight()}
              ${useEuiOverflowScroll('y', false)}
              ${useEuiOverflowScroll('x', false)}
            `}
          >
            {panelContents}
          </div>
          <ResizeHandle interactionStart={interactionStart} />
        </EuiPanel>
      </div>
    );
  }
);
