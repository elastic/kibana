/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { combineLatest, map, pairwise, skip } from 'rxjs';

import { EuiButtonIcon, EuiFlexGroup, EuiSpacer, EuiTitle, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';

import { DragPreview } from './drag_preview';
import { GridPanel } from './grid_panel';
import { GridLayoutStateManager, GridRowData, PanelInteractionEvent } from './types';

export const GridRow = forwardRef<
  HTMLDivElement,
  {
    rowIndex: number;
    toggleIsCollapsed: (rowIndex: number) => void;
    renderPanelContents: (
      panelId: string,
      setDragHandles: (refs: Array<HTMLElement | null>) => void
    ) => React.ReactNode;
    setInteractionEvent: (interactionData?: PanelInteractionEvent) => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }
>(
  (
    {
      rowIndex,
      toggleIsCollapsed,
      renderPanelContents,
      setInteractionEvent,
      gridLayoutStateManager,
    },
    gridRef
  ) => {
    const currentRow = gridLayoutStateManager.gridLayout$.value[rowIndex];
    const [panelIds, setPanelIds] = useState<string[]>(Object.keys(currentRow.panels));
    const [rowTitle, setRowTitle] = useState<string>(currentRow.title);
    const [isCollapsed, setIsCollapsed] = useState<boolean>(currentRow.isCollapsed);

    const getRowCount = useCallback(
      (row: GridRowData) => {
        const maxRow = Object.values(row.panels).reduce((acc, panel) => {
          return Math.max(acc, panel.row + panel.height);
        }, 0);
        return maxRow || 1;
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rowIndex]
    );
    const rowContainer = useRef<HTMLDivElement | null>(null);

    /** Set initial styles based on state at mount to prevent styles from "blipping" */
    const initialStyles = useMemo(() => {
      const initialRow = gridLayoutStateManager.gridLayout$.getValue()[rowIndex];
      const runtimeSettings = gridLayoutStateManager.runtimeSettings$.getValue();
      const { gutterSize, columnCount, rowHeight } = runtimeSettings;

      return css`
        gap: ${gutterSize}px;
        grid-template-columns: repeat(
          ${columnCount},
          calc((100% - ${gutterSize * (columnCount - 1)}px) / ${columnCount})
        );
        grid-template-rows: repeat(${getRowCount(initialRow)}, ${rowHeight}px);
      `;
    }, [gridLayoutStateManager, getRowCount, rowIndex]);

    useEffect(
      () => {
        /** Update the styles of the grid row via a subscription to prevent re-renders */
        const interactionStyleSubscription = combineLatest([
          gridLayoutStateManager.interactionEvent$,
          gridLayoutStateManager.gridLayout$,
          gridLayoutStateManager.runtimeSettings$,
        ])
          .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
          .subscribe(([interactionEvent, gridLayout, runtimeSettings]) => {
            const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];
            if (!rowRef) return;

            const { gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;

            rowRef.style.gridTemplateRows = `repeat(${getRowCount(
              gridLayout[rowIndex]
            )}, ${rowHeight}px)`;

            const targetRow = interactionEvent?.targetRowIndex;
            if (rowIndex === targetRow && interactionEvent) {
              // apply "targetted row" styles
              const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);
              rowRef.style.backgroundPosition = `top -${gutterSize / 2}px left -${
                gutterSize / 2
              }px`;
              rowRef.style.backgroundSize = ` ${columnPixelWidth + gutterSize}px ${
                rowHeight + gutterSize
              }px`;
              rowRef.style.backgroundImage = `linear-gradient(to right, ${gridColor} 1px, transparent 1px),
        linear-gradient(to bottom, ${gridColor} 1px, transparent 1px)`;
              rowRef.style.backgroundColor = `${transparentize(
                euiThemeVars.euiColorSuccess,
                0.05
              )}`;
            } else {
              // undo any "targetted row" styles
              rowRef.style.backgroundPosition = ``;
              rowRef.style.backgroundSize = ``;
              rowRef.style.backgroundImage = ``;
              rowRef.style.backgroundColor = `transparent`;
            }
          });

        const expandedPanelStyleSubscription = gridLayoutStateManager.expandedPanelId$
          .pipe(skip(1)) // skip the first emit because the `initialStyles` will take care of it
          .subscribe((expandedPanelId) => {
            const rowContainerRef = rowContainer.current;
            const rowRef = gridLayoutStateManager.rowRefs.current[rowIndex];

            if (!rowContainerRef) return;

            if (expandedPanelId) {
              // If any panel is expanded, move all rows with their panels out of the viewport.
              // The expanded panel is repositioned to its original location in the GridPanel component
              // and stretched to fill the viewport.

              rowContainerRef.style.transform = 'translate(-9999px, -9999px)';

              const panelsIds = Object.keys(
                gridLayoutStateManager.gridLayout$.getValue()[rowIndex].panels
              );
              const includesExpandedPanel = panelsIds.includes(expandedPanelId);
              if (includesExpandedPanel) {
                // Stretch the row with the expanded panel to occupy the entire remaining viewport
                rowContainerRef.style.height = '100%';
              } else {
                // Hide the row if it does not contain the expanded panel
                rowContainerRef.style.height = '0';
              }

              if (rowRef) {
                rowRef.style.height = '0px';
                rowRef.style.display = 'block';
              }
            } else {
              rowContainerRef.style.transform = ``;
              rowContainerRef.style.height = ``;
              if (rowRef) {
                rowRef.style.height = '';
                rowRef.style.display = 'grid';
              }
            }
          });

        /**
         * The things that should trigger a re-render are title, collapsed state, and panel ids - panel positions
         * are being controlled via CSS styles, so they do not need to trigger a re-render. This subscription ensures
         * that the row will re-render when one of those three things changes.
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
            }
          });

        return () => {
          interactionStyleSubscription.unsubscribe();
          rowStateSubscription.unsubscribe();
          expandedPanelStyleSubscription.unsubscribe();
        };
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [rowIndex]
    );

    const interactionStart = useCallback(
      (
        panelId: string,
        type: PanelInteractionEvent['type'] | 'drop',
        e: MouseEvent | React.MouseEvent<HTMLDivElement, MouseEvent>
      ) => {
        e.stopPropagation();

        // Disable interactions when a panel is expanded
        const isInteractive = gridLayoutStateManager.expandedPanelId$.value === undefined;
        if (!isInteractive) return;

        const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelId];
        if (!panelRef) return;

        const panelRect = panelRef.getBoundingClientRect();
        if (type === 'drop') {
          setInteractionEvent(undefined);
        } else {
          setInteractionEvent({
            type,
            id: panelId,
            panelDiv: panelRef,
            targetRowIndex: rowIndex,
            mouseOffsets: {
              top: e.clientY - panelRect.top,
              left: e.clientX - panelRect.left,
              right: e.clientX - panelRect.right,
              bottom: e.clientY - panelRect.bottom,
            },
          });
        }
      },
      [gridLayoutStateManager, rowIndex, setInteractionEvent]
    );

    /**
     * Memoize panel children components to prevent unnecessary re-renders
     */
    const children = useMemo(() => {
      return panelIds.map((panelId) => (
        <GridPanel
          key={panelId}
          panelId={panelId}
          rowIndex={rowIndex}
          gridLayoutStateManager={gridLayoutStateManager}
          renderPanelContents={renderPanelContents}
          interactionStart={interactionStart}
          ref={(element) => {
            if (!gridLayoutStateManager.panelRefs.current[rowIndex]) {
              gridLayoutStateManager.panelRefs.current[rowIndex] = {};
            }
            gridLayoutStateManager.panelRefs.current[rowIndex][panelId] = element;
          }}
        />
      ));
    }, [panelIds, rowIndex, gridLayoutStateManager, renderPanelContents, interactionStart]);

    return (
      <div ref={rowContainer}>
        {rowIndex !== 0 && (
          <GridRowHeader
            isCollapsed={isCollapsed}
            toggleIsCollapsed={() => toggleIsCollapsed(rowIndex)}
            rowTitle={rowTitle}
          />
        )}
        {!isCollapsed && (
          <div
            ref={gridRef}
            css={css`
              display: grid;
              justify-items: stretch;
              transition: background-color 300ms linear;
              ${initialStyles};
            `}
          >
            {children}
            <DragPreview rowIndex={rowIndex} gridLayoutStateManager={gridLayoutStateManager} />
          </div>
        )}
      </div>
    );
  }
);

const GridRowHeader = ({
  isCollapsed,
  toggleIsCollapsed,
  rowTitle,
}: {
  isCollapsed: boolean;
  toggleIsCollapsed: () => void;
  rowTitle?: string;
}) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s">
        <EuiButtonIcon
          color="text"
          aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
            defaultMessage: 'Toggle collapse',
          })}
          iconType={isCollapsed ? 'arrowRight' : 'arrowDown'}
          onClick={toggleIsCollapsed}
        />
        <EuiTitle size="xs">
          <h2>{rowTitle}</h2>
        </EuiTitle>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
    </>
  );
};
