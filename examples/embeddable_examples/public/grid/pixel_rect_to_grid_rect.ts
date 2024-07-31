/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  GridLayout,
  GridRect,
  PanelInteractionEvent,
  PixelCoordinate,
  PixelRect,
  RuntimeGridSettings,
} from './types';
import { getClosestGridRowIndex, pixelCoordinateToGrid } from './grid_layout_utils';

export const pixelRectToGridRect = ({
  rows,
  pixelRect,
  gridLayout,
  runtimeSettings,
  interactionEvent,
}: {
  pixelRect: PixelRect;
  gridLayout: GridLayout;
  rows: Array<HTMLDivElement | null>;
  runtimeSettings: RuntimeGridSettings;
  interactionEvent: PanelInteractionEvent;
}): GridRect => {
  const targetedPanel = gridLayout[interactionEvent.originRowIndex][interactionEvent.id];
  const targetedRowIndex = getClosestGridRowIndex({
    panelTopLeft: pixelRect.pixelOrigin,
    gridDivs: rows,
  });

  const rowRect = rows[targetedRowIndex]?.getBoundingClientRect();
  const gridOrigin: PixelCoordinate = {
    x: rowRect?.left || 0,
    y: rowRect?.top || 0,
  };

  const gridCoordinate = pixelCoordinateToGrid({
    runtimeSettings,
    panel: targetedPanel,
    isResize: interactionEvent.type === 'resize',
    panelTopLeft: pixelRect.pixelOrigin,
    gridOrigin,
  });

  const gridSize = 
};
