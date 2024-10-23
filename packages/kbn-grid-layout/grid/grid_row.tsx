/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { forwardRef, useMemo, useRef } from 'react';

import { EuiButtonIcon, EuiFlexGroup, EuiSpacer, EuiTitle, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { euiThemeVars } from '@kbn/ui-theme';
import { useStateFromPublishingSubject } from '@kbn/presentation-publishing';

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
      targetRowIndex,
      runtimeSettings,
      toggleIsCollapsed,
      renderPanelContents,
      setInteractionEvent,
      gridLayoutStateManager,
    },
    gridRef
  ) => {
    const dragPreviewRef = useRef<HTMLDivElement | null>(null);
    const activePanel = useStateFromPublishingSubject(gridLayoutStateManager.activePanel$);

    const { gutterSize, columnCount, rowHeight } = runtimeSettings;
    const isGridTargeted = activePanel?.id && targetRowIndex === rowIndex;

    // calculate row count based on the number of rows needed to fit all panels
    const rowCount = useMemo(() => {
      const maxRow = Object.values(rowData.panels).reduce((acc, panel) => {
        return Math.max(acc, panel.row + panel.height);
      }, 0);
      return maxRow || 1;
    }, [rowData]);

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
                activePanelId={activePanel?.id}
                renderPanelContents={renderPanelContents}
                interactionStart={(type, e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const panelRef = gridLayoutStateManager.panelRefs.current[rowIndex][panelData.id];
                  if (!panelRef) return;

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
                ref={(element) => {
                  if (!gridLayoutStateManager.panelRefs.current[rowIndex]) {
                    gridLayoutStateManager.panelRefs.current[rowIndex] = {};
                  }
                  gridLayoutStateManager.panelRefs.current[rowIndex][panelData.id] = element;
                }}
              />
            ))}

            {/* render the drag preview if this row is currently being targetted */}
            {isGridTargeted && (
              <div
                ref={dragPreviewRef}
                css={css`
                  pointer-events: none;
                  border-radius: ${euiThemeVars.euiBorderRadius};
                  background-color: ${transparentize(euiThemeVars.euiColorSuccess, 0.2)};
                  transition: opacity 100ms linear;

                  grid-column-start: ${rowData.panels[activePanel.id].column + 1};
                  grid-column-end: ${rowData.panels[activePanel.id].column +
                  1 +
                  rowData.panels[activePanel.id].width};
                  grid-row-start: ${rowData.panels[activePanel.id].row + 1};
                  grid-row-end: ${rowData.panels[activePanel.id].row +
                  1 +
                  rowData.panels[activePanel.id].height};
                `}
              />
            )}
          </div>
        )}
      </>
    );
  }
);
