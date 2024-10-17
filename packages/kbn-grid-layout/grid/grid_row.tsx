/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { EuiButtonIcon, EuiFlexGroup, EuiSpacer, EuiTitle, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { combineLatest } from 'rxjs';
import { GridPanel } from './grid_panel';
import {
  GridLayoutStateManager,
  GridRowData,
  PanelInteractionEvent,
  RuntimeGridSettings,
} from './types';

const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);
const getGridBackgroundCSS = (settings: RuntimeGridSettings) => {
  const { gutterSize, columnPixelWidth, rowHeight } = settings;
  return css`
    background-position: top -${gutterSize / 2}px left -${gutterSize / 2}px;
    background-size: ${columnPixelWidth + gutterSize}px ${rowHeight + gutterSize}px;
    background-image: linear-gradient(to right, ${gridColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);
  `;
};

export const GridRow = forwardRef<
  HTMLDivElement,
  {
    rowIndex: number;
    rowData: GridRowData;
    toggleIsCollapsed: () => void;
    activePanelId: string | undefined;
    targetRowIndex: number | undefined;
    runtimeSettings: RuntimeGridSettings;
    renderPanelContents: (panelId: string) => React.ReactNode;
    setInteractionEvent: (interactionData?: PanelInteractionEvent) => void;
    gridLayoutStateManager: GridLayoutStateManager;
  }
>(
  (
    {
      rowData,
      rowIndex,
      activePanelId,
      targetRowIndex,
      runtimeSettings,
      toggleIsCollapsed,
      renderPanelContents,
      setInteractionEvent,
      gridLayoutStateManager,
    },
    gridRef
  ) => {
    const { gutterSize, columnCount, rowHeight } = runtimeSettings;
    const isGridTargeted = activePanelId && targetRowIndex === rowIndex;
    const dragPreviewRef = useRef<HTMLDivElement | null>(null);
    const panelRefs = useRef<{ [panelId: string]: HTMLDivElement | null }>({});

    // calculate row count based on the number of rows needed to fit all panels
    const rowCount = useMemo(() => {
      const maxRow = Object.values(rowData.panels).reduce((acc, panel) => {
        return Math.max(acc, panel.row + panel.height);
      }, 0);
      return maxRow || 1;
    }, [rowData]);

    useEffect(() => {
      const onLayoutChangeSubscription = combineLatest([
        gridLayoutStateManager.gridLayout$,
        gridLayoutStateManager.draggingPosition$,
      ]).subscribe(([gridLayout, draggingPosition]) => {
        const currentRow = gridLayout[rowIndex];
        Object.keys(currentRow.panels).forEach((key) => {
          const panel = currentRow.panels[key];
          const panelRef = panelRefs.current[key];
          if (!panelRef) return;

          if (panel.id === activePanelId && draggingPosition) {
            // if the current panel is being dragged, render it with a fixed position
            panelRef.style.position = 'fixed';
            panelRef.style.left = `${draggingPosition.left}px`;
            panelRef.style.top = `${draggingPosition.top}px`;
            panelRef.style.width = `${draggingPosition.right - draggingPosition.left}px`;
            panelRef.style.height = `${draggingPosition.bottom - draggingPosition.top}px`;

            // undo any "lock to grid" styles
            panelRef.style.gridColumnStart = ``;
            panelRef.style.gridColumnEnd = ``;
            panelRef.style.gridRowStart = ``;
            panelRef.style.gridRowEnd = ``;

            if (dragPreviewRef.current) {
              // update the position of the drag preview
              dragPreviewRef.current.style.gridColumnStart = `${panel.column + 1}`;
              dragPreviewRef.current.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
              dragPreviewRef.current.style.gridRowStart = `${panel.row + 1}`;
              dragPreviewRef.current.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
            }
          } else {
            // if the panel is not being dragged, undo any dragging styles
            panelRef.style.position = '';
            panelRef.style.left = ``;
            panelRef.style.top = ``;
            panelRef.style.width = ``;
            panelRef.style.height = ``;

            // and render the panel locked to the grid
            panelRef.style.gridColumnStart = `${panel.column + 1}`;
            panelRef.style.gridColumnEnd = `${panel.column + 1 + panel.width}`;
            panelRef.style.gridRowStart = `${panel.row + 1}`;
            panelRef.style.gridRowEnd = `${panel.row + 1 + panel.height}`;
          }
        });
      });

      return () => {
        onLayoutChangeSubscription.unsubscribe();
      };
    }, [gridLayoutStateManager, activePanelId, rowData.panels, rowIndex]);

    return (
      <>
        {rowIndex !== 0 && (
          <>
            <EuiSpacer size="s" />
            <EuiFlexGroup gutterSize="s">
              <EuiButtonIcon
                color="text"
                aria-label={i18n.translate('kbnGridLayout.row.toggleCollapse', {
                  defaultMessage: 'Toggle collapse',
                })}
                iconType={rowData.isCollapsed ? 'arrowRight' : 'arrowDown'}
                onClick={toggleIsCollapsed}
              />
              <EuiTitle size="xs">
                <h2>{rowData.title}</h2>
              </EuiTitle>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}
        {!rowData.isCollapsed && (
          <div
            ref={gridRef}
            css={css`
              display: grid;
              gap: ${gutterSize}px;
              justify-items: stretch;
              grid-template-columns: repeat(
                ${columnCount},
                calc((100% - ${gutterSize * (columnCount - 1)}px) / ${columnCount})
              );
              grid-template-rows: repeat(${rowCount}, ${rowHeight}px);
              background-color: ${isGridTargeted
                ? transparentize(euiThemeVars.euiColorSuccess, 0.05)
                : 'transparent'};
              transition: background-color 300ms linear;
              ${isGridTargeted && getGridBackgroundCSS(runtimeSettings)}
            `}
          >
            {Object.values(rowData.panels).map((panelData) => (
              <GridPanel
                key={panelData.id}
                panelData={panelData}
                activePanelId={activePanelId}
                renderPanelContents={renderPanelContents}
                interactionStart={(type, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const panelRef = panelRefs.current[panelData.id];
                  if (!panelRef) return;

                  console.log('interactionStart');

                  const panelRect = panelRef.getBoundingClientRect();
                  setInteractionEvent({
                    type,
                    id: panelData.id,
                    panelDiv: panelRef,
                    targetRowIndex: rowIndex,
                    mouseOffsets: {
                      top: e.clientY - panelRect.top,
                      left: e.clientX - panelRect.left,
                      right: e.clientX - panelRect.right,
                      bottom: e.clientY - panelRect.bottom,
                    },
                  });
                }}
                ref={(element) => (panelRefs.current[panelData.id] = element)}
              />
            ))}

            {activePanelId && rowData.panels[activePanelId] && (
              <div
                ref={dragPreviewRef}
                css={css`
                  pointer-events: none;
                  border-radius: ${euiThemeVars.euiBorderRadius};
                  background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
                  transition: opacity 100ms linear;
                `}
              />
            )}
          </div>
        )}
      </>
    );
  }
);
