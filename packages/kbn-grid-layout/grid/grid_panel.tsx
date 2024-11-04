/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, skip } from 'rxjs';

import { EuiIcon, transparentize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';

import { GridLayoutStateManager, PanelInteractionEvent } from './types';

export const GridPanel = forwardRef<
  HTMLDivElement,
  {
    panelId: string;
    rowIndex: number;
    renderPanelContents: (
      panelId: string,
      setDragHandles: (refs: Array<HTMLElement | null>) => void
    ) => React.ReactNode;
    interactionStart: (
      type: PanelInteractionEvent['type'],
      e: MouseEvent | React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }
>(
  (
    { panelId, rowIndex, renderPanelContents, interactionStart, gridLayoutStateManager },
    panelRef
  ) => {
    const removeEventListenersRef = useRef<(() => void) | null>(null);
    const [dragHandleCount, setDragHandleCount] = useState<number>(0);

    const { euiTheme } = useEuiTheme();

    const setDragHandles = useCallback(
      (dragHandles: Array<HTMLElement | null>) => {
        setDragHandleCount(dragHandles.length);
        const onMouseUp = (e: MouseEvent) => {
          interactionStart('drop', e);
        };
        const onMouseDown = (e: MouseEvent) => {
          interactionStart('drag', e);
          /**
           * By adding the "drop" event listener to the document rather than the drag handler, we
           * prevent the element from getting "stuck" in drag mode; however, we only attach this
           * event listener **when the drag event starts**, and it only executes once, which means
           * we don't have to remove the `mouseup` event listener
           */
          document.addEventListener('mouseup', onMouseUp, { once: true });
        };

        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.addEventListener('mousedown', onMouseDown);
        }

        removeEventListenersRef.current = () => {
          for (const handle of dragHandles) {
            if (handle === null) return;
            handle.removeEventListener('mousedown', onMouseDown);
          }
        };
      },
      [interactionStart]
    );

    useEffect(() => {
      return () => {
        if (removeEventListenersRef.current) {
          removeEventListenersRef.current();
        }
      };
    }, []);

    /** Set initial styles based on state at mount to prevent styles from "blipping" */
    const initialStyles = useMemo(() => {
      const initialPanel = gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels[panelId];
      return css`
        grid-column-start: ${initialPanel.column + 1};
        grid-column-end: ${initialPanel.column + 1 + initialPanel.width};
        grid-row-start: ${initialPanel.row + 1};
        grid-row-end: ${initialPanel.row + 1 + initialPanel.height};
      `;
    }, [gridLayoutStateManager, rowIndex, panelId]);

    useEffect(
      () => {
        /** Update the styles of the panel via a subscription to prevent re-renders */
        const styleSubscription = combineLatest([
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
                ref.style.position = 'fixed';
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
              ref.style.zIndex = `auto`;

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

        return () => {
          styleSubscription.unsubscribe();
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      []
    );

    return (
      <div ref={panelRef} css={initialStyles}>
        <div
          css={css`
            position: relative;
            height: 100%;

            &:hover,
            &:active {
              & .dragHandle,
              & .resizeHandle {
                opacity: 1;
              }
            }
          `}
        >
          {/* drag handle */}
          {!dragHandleCount && (
            <div
              className="dragHandle"
              css={css`
                opacity: 0;
                display: flex;
                cursor: move;
                position: absolute;
                align-items: center;
                justify-content: center;
                top: -${euiThemeVars.euiSizeL};
                width: ${euiThemeVars.euiSizeL};
                height: ${euiThemeVars.euiSizeL};
                z-index: ${euiThemeVars.euiZLevel3};
                margin-left: ${euiThemeVars.euiSizeS};
                border: 1px solid ${euiTheme.border.color};
                background-color: ${euiTheme.colors.emptyShade};
                border-radius: ${euiThemeVars.euiBorderRadius} ${euiThemeVars.euiBorderRadius} 0 0;
                &:hover {
                  cursor: grab;
                  opacity: 1 !important;
                }
                &:active {
                  cursor: grabbing;
                  opacity: 1 !important;
                }
              `}
              onMouseDown={(e) => interactionStart('drag', e)}
              onMouseUp={(e) => interactionStart('drop', e)}
            >
              <EuiIcon type="grabOmnidirectional" />
            </div>
          )}
          {/* Resize handle */}
          <div
            className="resizeHandle"
            onMouseDown={(e) => interactionStart('resize', e)}
            onMouseUp={(e) => interactionStart('drop', e)}
            css={css`
              right: 0;
              bottom: 0;
              opacity: 0;
              margin: -2px;
              z-index: 1000;
              position: absolute;
              width: ${euiThemeVars.euiSizeL};
              height: ${euiThemeVars.euiSizeL};
              transition: opacity 0.2s, border 0.2s;
              border-radius: 7px 0 7px 0;
              border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
              border-right: 2px solid ${euiThemeVars.euiColorSuccess};
              :hover {
                background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
                cursor: se-resize;
              }
            `}
          />

          {renderPanelContents(panelId, setDragHandles)}
        </div>
      </div>
    );
  }
);
