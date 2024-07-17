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
import {
  GridCoordinate,
  GridData,
  InteractionData,
  PixelCoordinate,
  RuntimeGridSettings,
} from './types';

const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);

export const getClosestGridRowIndex = ({
  panelTopLeft,
  gridDivs,
}: {
  panelTopLeft: PixelCoordinate;
  gridDivs: Array<HTMLDivElement | null>;
}): number => {
  let closestIndex = 0;
  let closestDistance = Number.MAX_VALUE;
  const { scrollTop } = getScrollAmount();
  const panelTop = panelTopLeft.y + scrollTop;
  for (const [index, div] of gridDivs.entries()) {
    if (!div) continue;
    const divTop = div.offsetTop;
    const divBottom = divTop + div.clientHeight;

    // if the panel top is inside this div, return it immediately.
    if (panelTop >= divTop && panelTop <= divBottom) {
      return index;
    }

    // otherwise measure the distance between the panel top and the div center
    const divCenter = divTop + div.clientHeight / 2;
    const distance = Math.abs(panelTop - divCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  return closestIndex;
};

export const gridSizeToPixelSize = ({
  width,
  height,
  runtimeSettings,
}: {
  width: number;
  height: number;
  runtimeSettings: RuntimeGridSettings;
}) => {
  const { columnPixelWidth, rowHeight, gutterSize } = runtimeSettings;
  return {
    width: width * columnPixelWidth + (width - 1) * gutterSize,
    height: height * rowHeight + (height - 1) * gutterSize,
  };
};

export const gridToPixelCoordinate = ({
  gridLocation,
  runtimeSettings,
  gridOrigin,
}: {
  runtimeSettings: RuntimeGridSettings;
  gridOrigin: PixelCoordinate;
  gridLocation: GridCoordinate;
}): PixelCoordinate => {
  const { columnPixelWidth, rowHeight, gutterSize } = runtimeSettings;
  return {
    x: gridOrigin.x + gridLocation.column * columnPixelWidth + gridLocation.column * gutterSize,
    y: gridOrigin.y + gridLocation.row * rowHeight + gridLocation.row * gutterSize,
  };
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

const getScrollAmount = () => ({
  scrollLeft:
    window.pageXOffset !== undefined
      ? window.pageXOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
  scrollTop:
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollTop,
});

export const updateDragPreview = ({
  mousePoint,
  interactionData,
  runtimeSettings,
  dragPreview,
  gridOrigin,
}: {
  gridOrigin: PixelCoordinate;
  mousePoint: PixelCoordinate;
  interactionData: InteractionData;
  runtimeSettings: RuntimeGridSettings;
  dragPreview: HTMLDivElement;
}) => {
  const { scrollLeft, scrollTop } = getScrollAmount();
  if (interactionData.type === 'drag') {
    const pixelSize = gridSizeToPixelSize({
      runtimeSettings,
      height: interactionData.panelData.height,
      width: interactionData.panelData.width,
    });
    dragPreview.style.left = `${mousePoint.x + scrollLeft}px`;
    dragPreview.style.top = `${mousePoint.y + scrollTop}px`;
    dragPreview.style.width = `${pixelSize.width}px`;
    dragPreview.style.height = `${pixelSize.height}px`;
  } else if (interactionData.type === 'resize') {
    const topLeft = gridToPixelCoordinate({
      gridLocation: {
        row: interactionData.panelData.row,
        column: interactionData.panelData.column,
      },
      gridOrigin,
      runtimeSettings,
    });
    dragPreview.style.left = `${topLeft.x + scrollLeft}px`;
    dragPreview.style.top = `${topLeft.y + scrollTop}px`;
    dragPreview.style.width = `${mousePoint.x - topLeft.x}px`;
    dragPreview.style.height = `${mousePoint.y - topLeft.y}px`;
  }
};
