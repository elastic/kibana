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
import React from 'react';
import { useMemo, useRef } from 'react';
import { KibanaGridElement } from './grid_layout_element';
import { getGridBackgroundCSS } from './grid_layout_utils';
import { GridRow, InteractionData, RuntimeGridSettings } from './types';

export const KibanaGridRow = ({
  rowIndex,
  gridRow,
  runtimeSettings,
  interactionData,
  updateShift,
  updateInteractionData,
}: {
  rowIndex: number;
  gridRow: GridRow;
  updateShift: (pos: { x: number; y: number }) => void;
  interactionData?: InteractionData;
  runtimeSettings: RuntimeGridSettings;
  updateInteractionData: (interactionData?: InteractionData) => void;
}) => {
  const { gutterSize, columnCount, rowHeight } = runtimeSettings;

  // keep a reference to the grid element to calculate the mouse position relative to the grid
  const gridRef = useRef<HTMLDivElement>(null);

  // calculate row count based on the number of rows needed to fit all panels
  const rowCount = useMemo(() => {
    const maxRow = Object.values(gridRow).reduce((acc, panel) => {
      return Math.max(acc, panel.row + panel.height);
    }, 0);
    if (interactionData?.type === 'resize') return maxRow + 1;
    return maxRow || 1;
  }, [gridRow, interactionData]);

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
          grid-template-columns: repeat(
            ${columnCount},
            calc((100% - ${gutterSize * (columnCount - 1)}px) / ${columnCount})
          );
          grid-template-rows: repeat(${rowCount}, ${rowHeight}px);
          justify-items: stretch;
          background-color: ${interactionData?.targetedRow === rowIndex
            ? transparentize(euiThemeVars.euiColorSuccess, 0.05)
            : 'transparent'};
          ${interactionData && getGridBackgroundCSS(runtimeSettings)}
        `}
      >
        {Object.values(gridRow).map((gridData) => (
          <KibanaGridElement
            isBeingDragged={interactionData?.panelData.id === gridData.id}
            anyDragActive={Boolean(interactionData)}
            setResizingId={(id) => {
              updateInteractionData({
                type: 'resize',
                panelData: { ...gridRow[id] },
                targetedRow: rowIndex,
              });
            }}
            setDraggingId={(id) => {
              updateInteractionData({
                type: 'drag',
                panelData: { ...gridRow[id] },
                targetedRow: rowIndex,
              });
            }}
            updateShift={updateShift}
            gridData={gridData}
            key={gridData.id}
            id={gridData.id}
          />
        ))}
      </div>
    </>
  );
};
