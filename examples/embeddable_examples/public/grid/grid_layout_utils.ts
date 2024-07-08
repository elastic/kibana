/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { transparentize } from '@elastic/eui';
import { css } from '@emotion/react';
import { euiThemeVars } from '@kbn/ui-theme';
import { GridCoordinate, GridData, PixelCoordinate, RuntimeGridSettings } from './types';

export const getClosestGridRowIndex = ({
  panelTopLeft,
  gridDivs,
}: {
  panelTopLeft: PixelCoordinate;
  gridDivs: Array<HTMLDivElement | null>;
}): number => {
  const panelTop = panelTopLeft.y;
  for (const [index, div] of gridDivs.entries()) {
    if (!div) continue;
    const divTop = div.offsetTop;
    const divBottom = divTop + div.clientHeight;
    if (panelTop >= divTop && panelTop <= divBottom) {
      return index;
    }
  }
  return 0;
};

export const pixelCoordinateToGrid = ({
  runtimeSettings,
  gridOrigin,
  panelTopLeft,
  isResize,
  panel,
}: {
  panel?: GridData;
  isResize: boolean;
  panelTopLeft: PixelCoordinate;
  gridOrigin: PixelCoordinate;
  runtimeSettings: RuntimeGridSettings;
}): GridCoordinate => {
  const { columnCount, gutterSize, rowHeight, columnPixelWidth } = runtimeSettings;
  const localXCoordinate = panelTopLeft.x - gridOrigin.x;
  const localYCoordinate = panelTopLeft.y - gridOrigin.y;

  const maxColumn = panel && !isResize ? columnCount - panel.width : columnCount;

  const column = Math.min(
    Math.max(Math.round(localXCoordinate / (columnPixelWidth + gutterSize)), 0),
    maxColumn
  );
  const row = Math.max(Math.round(localYCoordinate / (rowHeight + gutterSize)), 0);

  return { column, row };
};

export const getGridBackgroundCSS = (settings: RuntimeGridSettings) => {
  const { gutterSize, columnPixelWidth, rowHeight } = settings;
  const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.1);
  return css`
    background-position: top -${gutterSize / 2}px left -${gutterSize / 2}px;
    background-size: ${columnPixelWidth + gutterSize}px ${rowHeight + gutterSize}px;
    background-image: linear-gradient(to right, ${gridColor} 1px, transparent 1px),
      linear-gradient(to bottom, ${gridColor} 1px, transparent 1px);
  `;
};

export const isGridDataEqual = (a?: GridData, b?: GridData) => {
  return (
    a?.id === b?.id &&
    a?.column === b?.column &&
    a?.row === b?.row &&
    a?.width === b?.width &&
    a?.height === b?.height
  );
};
