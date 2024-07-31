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
import { debounce } from 'lodash';
import { useMemo } from 'react';
import { BehaviorSubject } from 'rxjs';
import useResizeObserver from 'use-resize-observer/polyfilled';
import {
  GridCoordinate,
  GridData,
  GridSettings,
  PixelCoordinate,
  PixelRect,
  RuntimeGridSettings,
} from './types';

const gridColor = transparentize(euiThemeVars.euiColorSuccess, 0.2);

/**
 * Listens to the width of any element passed the returned ref and calculates the column width on
 * the fly when the element is resized.
 */
export const useRuntimeGridSettings = ({ gridSettings }: { gridSettings: GridSettings }) => {
  const { runtimeSettings$, onWidthChange } = useMemo(() => {
    const settings = new BehaviorSubject<RuntimeGridSettings>({
      ...gridSettings,
      columnPixelWidth: 0,
    });
    const onChange = debounce((elementWidth: number) => {
      const columnPixelWidth =
        (elementWidth - gridSettings.gutterSize * (gridSettings.columnCount - 1)) /
        gridSettings.columnCount;
      settings.next({ ...gridSettings, columnPixelWidth });
    }, 250);
    return { runtimeSettings$: settings, onWidthChange: onChange };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { ref: gridSizeRef } = useResizeObserver<HTMLDivElement>({
    onResize: (dimensions) => {
      if (dimensions.width) {
        onWidthChange(dimensions.width);
      }
    },
  });

  return { runtimeSettings$, gridSizeRef };
};

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

export const getScrollAmount = () => ({
  scrollLeft:
    window.pageXOffset !== undefined
      ? window.pageXOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollLeft,
  scrollTop:
    window.pageYOffset !== undefined
      ? window.pageYOffset
      : (document.documentElement || document.body.parentNode || document.body).scrollTop,
});

export const updateDragPreviewRect = ({
  pixelRect,
  dragPreview,
}: {
  pixelRect: PixelRect;
  dragPreview: HTMLDivElement | null;
}) => {
  if (!dragPreview) return;
  dragPreview.style.opacity = '1';
  dragPreview.style.left = `${pixelRect.pixelOrigin.x}px`;
  dragPreview.style.top = `${pixelRect.pixelOrigin.y}px`;
  dragPreview.style.width = `${pixelRect.pixelWidth}px`;
  dragPreview.style.height = `${pixelRect.pixelHeight}px`;
};

export const hideDragPreviewRect = (dragPreview: HTMLDivElement | null) => {
  if (!dragPreview) return;
  dragPreview.style.opacity = '0';
};
