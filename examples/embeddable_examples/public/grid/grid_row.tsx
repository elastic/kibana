/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiHorizontalRule, EuiTitle, transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
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
    gridRow: GridRowData;
    activePanelId: string | undefined;
    targetRowIndex: number | undefined;
    runtimeSettings: RuntimeGridSettings;
    setInteractionEvent: (interactionData?: PanelInteractionEvent) => void;
  }
>(
  (
    { rowIndex, gridRow, setInteractionEvent, activePanelId, runtimeSettings, targetRowIndex },
    gridRef
  ) => {
    const { gutterSize, columnCount, rowHeight } = runtimeSettings;
    const isGridTargeted = activePanelId && targetRowIndex === rowIndex;

    // calculate row count based on the number of rows needed to fit all panels
    const rowCount = useMemo(() => {
      const maxRow = Object.values(gridRow).reduce((acc, panel) => {
        return Math.max(acc, panel.row + panel.height);
      }, 0);
      return maxRow || 1;
    }, [gridRow]);

    return (
      <>
        <EuiHorizontalRule margin="m" />
        <EuiTitle>
          <h2>Section</h2>
        </EuiTitle>
        <EuiHorizontalRule margin="m" />
        <div
          ref={gridRef}
          css={css`
            height: 100%;
            width: 100%;
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
          {Object.values(gridRow).map((gridData) => (
            <GridPanel
              key={gridData.id}
              panelData={gridData}
              activePanelId={activePanelId}
              setInteractionEvent={(partialInteractionEvent) => {
                if (partialInteractionEvent) {
                  setInteractionEvent({
                    ...partialInteractionEvent,
                    targetRowIndex: rowIndex,
                    originRowIndex: rowIndex,
                  });
                  return;
                }
                setInteractionEvent();
              }}
            />
          ))}
        </div>
      </>
    );
  }
);
