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
import React, { forwardRef, useMemo } from 'react';
import { GridPanel } from './grid_panel';
import { GridRowData, PanelInteractionEvent, RuntimeGridSettings } from './types';

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
    },
    gridRef
  ) => {
    const { gutterSize, columnCount, rowHeight } = runtimeSettings;
    const isGridTargeted = activePanelId && targetRowIndex === rowIndex;

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
                activePanelId={activePanelId}
                renderPanelContents={renderPanelContents}
                setInteractionEvent={(partialInteractionEvent) => {
                  if (partialInteractionEvent) {
                    setInteractionEvent({
                      ...partialInteractionEvent,
                      targetRowIndex: rowIndex,
                    });
                    return;
                  }
                  setInteractionEvent();
                }}
              />
            ))}
          </div>
        )}
      </>
    );
  }
);
