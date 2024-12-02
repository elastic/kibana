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
import { getKeysInOrder } from './utils/resolve_grid_row';

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
      panelId: string,
      type: PanelInteractionEvent['type'] | 'drop',
      e: MouseEvent | React.MouseEvent<HTMLDivElement, MouseEvent>
    ) => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }
>(
  (
    { panelId, rowIndex, renderPanelContents, interactionStart, gridLayoutStateManager },
    panelRef
  ) => {
    // const resizeHandleRef = useRef<HTMLDivElement | null>(null);
    const removeEventListenersRef = useRef<(() => void) | null>(null);
    const [dragHandleCount, setDragHandleCount] = useState<number>(0);
    const dragHandleRefs = useRef<Array<HTMLElement | null>>([]);

    const { euiTheme } = useEuiTheme();

    useEffect(() => {
      const onDropEventHandler = (dropEvent: MouseEvent) =>
        interactionStart(panelId, 'drop', dropEvent);
      /**
       * Subscription to add a singular "drop" event handler whenever an interaction starts -
       * this is handled in a subscription so that it is not lost when the component gets remounted
       * (which happens when a panel gets dragged from one grid row to another)
       */
      const dropEventSubscription = gridLayoutStateManager.interactionEvent$.subscribe((event) => {
        if (!event || event.id !== panelId) return;

        /**
         * By adding the "drop" event listener to the document rather than the drag/resize event handler,
         * we prevent the element from getting "stuck" in an interaction; however, we only attach this event
         * listener **when the drag/resize event starts**, and it only executes once, which means we don't
         * have to remove the `mouseup` event listener
         */
        document.addEventListener('mouseup', onDropEventHandler, {
          once: true,
          passive: true,
        });
      });

      return () => {
        dropEventSubscription.unsubscribe();
        document.removeEventListener('mouseup', onDropEventHandler); // removes the event listener on row change
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * We need to memoize the `onMouseDown` callback so that we don't assign a new `onMouseDown` event handler
     * every time `setDragHandles` is called
     */
    const onMouseDown = useCallback(
      (e: MouseEvent) => {
        if (gridLayoutStateManager.accessMode$.getValue() !== 'EDIT' || e.button !== 0) {
          // ignore anything but left clicks, and ignore clicks when not in edit mode
          return;
        }
        e.stopPropagation();
        interactionStart(panelId, 'drag', e);
      },
      [interactionStart, panelId]
    );

    const setDragHandles = useCallback(
      (dragHandles: Array<HTMLElement | null>) => {
        setDragHandleCount(dragHandles.length);
        dragHandleRefs.current = dragHandles;

        for (const handle of dragHandles) {
          if (handle === null) return;
          handle.addEventListener('mousedown', onMouseDown, { passive: true });
        }

        removeEventListenersRef.current = () => {
          for (const handle of dragHandles) {
            if (handle === null) return;
            handle.removeEventListener('mousedown', onMouseDown);
          }
        };
      },
      [onMouseDown]
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
            // console.log('SUBSCRIBE!!!!');
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
                ref.style.gridColumnEnd = `auto`;
                ref.style.gridRowEnd = `auto`;

                // if (resizeHandleRef.current) {
                //   resizeHandleRef.current.style.width = `${Math.min(
                //     24,
                //     runtimeSettings.columnPixelWidth * panel.width
                //   )}px`;
                // }
              } else {
                // if the current panel is being dragged, render it with a fixed position + size
                ref.style.position = 'fixed';

                ref.style.left = `${draggingPosition.left}px`;
                ref.style.top = `${draggingPosition.top}px`;
                ref.style.width = `${draggingPosition.right - draggingPosition.left}px`;
                ref.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

                // undo any "lock to grid" styles
                ref.style.gridArea = `auto`; // shortcut to set all grid styles to `auto`

                ref.classList.add('react-draggable-dragging');
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

              ref.classList.remove('react-draggable-dragging');
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

            const sortedKeys = getKeysInOrder(gridLayout[rowIndex]);
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
      return renderPanelContents(panelId, setDragHandles);
    }, [panelId, setDragHandles, renderPanelContents]);

    return (
      <>
        <div ref={panelRef} css={initialStyles}>
          <div
            css={css`
              padding: 0;
              position: relative;
              height: 100%;
            `}
          >
            {/* drag handle */}
            {!dragHandleCount && (
              <div
                className="kbnGridPanel__dragHandle"
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
                  .kbnGrid--static & {
                    opacity: 0 !important;
                    display: none;
                  }
                `}
                onMouseDown={(e) => interactionStart(panelId, 'drag', e)}
                onMouseUp={(e) => interactionStart(panelId, 'drop', e)}
              >
                <EuiIcon type="grabOmnidirectional" />
              </div>
            )}
            {/* Resize handle */}
            <div
              className="kbnGridPanel__resizeHandle"
              onMouseDown={(e) => interactionStart(panelId, 'resize', e)}
              onMouseUp={(e) => interactionStart(panelId, 'drop', e)}
              css={css`
                z-index: 9000;
                right: 0;
                bottom: 0;
                opacity: 0;
                margin: -2px;
                position: absolute;
                width: ${euiThemeVars.euiSizeL};
                height: ${euiThemeVars.euiSizeL};
                transition: opacity 0.2s, border 0.2s;
                border-radius: 7px 0 7px 0;
                border-bottom: 2px solid ${euiThemeVars.euiColorSuccess};
                border-right: 2px solid ${euiThemeVars.euiColorSuccess};
                :hover {
                  opacity: 1;
                  background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.05)};
                  cursor: se-resize;
                }
                .kbnGrid--static & {
                  opacity: 0 !important;
                  display: none;
                }
              `}
            />

            {panelContents}
          </div>
        </div>
      </>
    );
  }
);
