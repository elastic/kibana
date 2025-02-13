/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ParentNodeParams, ViewBoxParams } from '../types';

export function viewBoxToString(viewBox?: ViewBoxParams): undefined | string {
  if (!viewBox) {
    return;
  }

  return `${viewBox?.minX} ${viewBox?.minY} ${viewBox?.width} ${viewBox?.height}`;
}

function getMinxAndWidth(viewBoxParams: ViewBoxParams, { borderOffset, width }: ParentNodeParams) {
  let { minX, width: shapeWidth } = viewBoxParams;
  if (width) {
    const xOffset = (shapeWidth / width) * borderOffset;
    minX -= xOffset;
    shapeWidth += xOffset * 2;
  } else {
    shapeWidth = 0;
  }

  return [minX, shapeWidth];
}

function getMinyAndHeight(
  viewBoxParams: ViewBoxParams,
  { borderOffset, height }: ParentNodeParams
) {
  let { minY, height: shapeHeight } = viewBoxParams;
  if (height) {
    const yOffset = (shapeHeight / height) * borderOffset;
    minY -= yOffset;
    shapeHeight += yOffset * 2;
  } else {
    shapeHeight = 0;
  }

  return [minY, shapeHeight];
}

export function getViewBox(
  viewBoxParams: ViewBoxParams,
  parentNodeParams: ParentNodeParams
): ViewBoxParams {
  const [minX, width] = getMinxAndWidth(viewBoxParams, parentNodeParams);
  const [minY, height] = getMinyAndHeight(viewBoxParams, parentNodeParams);
  return { minX, minY, width, height };
}
