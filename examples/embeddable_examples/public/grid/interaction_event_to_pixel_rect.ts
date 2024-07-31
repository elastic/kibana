/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getScrollAmount, gridSizeToPixelSize, gridToPixelCoordinate } from './grid_layout_utils';
import {
  GridLayout,
  PanelInteractionEvent,
  PixelCoordinate,
  PixelRect,
  RuntimeGridSettings,
} from './types';

export const interactionEventToPixelRect = ({
  rows,
  gridLayout,
  mousePoint,
  runtimeSettings,
  interactionEvent,
}: {
  gridLayout: GridLayout;
  mousePoint: PixelCoordinate;
  rows: Array<HTMLDivElement | null>;
  runtimeSettings: RuntimeGridSettings;
  interactionEvent: PanelInteractionEvent;
}): PixelRect => {
  const targetedPanel = gridLayout[interactionEvent.originRowIndex][interactionEvent.id];
  const { scrollLeft, scrollTop } = getScrollAmount();
  if (interactionEvent.type === 'drag') {
    const pixelSize = gridSizeToPixelSize({
      runtimeSettings,
      height: targetedPanel.height,
      width: targetedPanel.width,
    });
    return {
      pixelOrigin: {
        x: mousePoint.x - interactionEvent.mouseToOriginOffset.x + scrollLeft,
        y: mousePoint.y - interactionEvent.mouseToOriginOffset.y + scrollTop,
      },
      pixelWidth: pixelSize.width,
      pixelHeight: pixelSize.height,
    };
  } else if (interactionEvent.type === 'resize') {
    // when resizing, we will always stay in the same grid, so we can use the origin row index
    const rowRect = rows[interactionEvent.originRowIndex]?.getBoundingClientRect();
    const gridOrigin: PixelCoordinate = {
      x: rowRect?.left || 0,
      y: rowRect?.top || 0,
    };

    const topLeft = gridToPixelCoordinate({
      gridLocation: {
        row: targetedPanel.row,
        column: targetedPanel.column,
      },
      gridOrigin,
      runtimeSettings,
    });
    return {
      pixelOrigin: {
        x: topLeft.x + scrollLeft,
        y: topLeft.y + scrollTop,
      },
      pixelWidth: mousePoint.x - interactionEvent.mouseToOriginOffset.x - topLeft.x,
      pixelHeight: mousePoint.y - interactionEvent.mouseToOriginOffset.y - topLeft.y,
    };
  }
  throw new Error('Invalid interaction event type');
};
