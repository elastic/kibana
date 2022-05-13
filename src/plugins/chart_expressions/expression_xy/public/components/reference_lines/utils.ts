/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import { IconPosition, YAxisMode } from '../../../common/types';

// if there's just one axis, put it on the other one
// otherwise use the same axis
// this function assume the chart is vertical
export function getBaseIconPlacement(
  iconPosition: IconPosition | undefined,
  axesMap?: Record<string, unknown>,
  axisMode?: YAxisMode
) {
  if (iconPosition === 'auto') {
    if (axisMode === 'bottom') {
      return Position.Top;
    }
    if (axesMap) {
      if (axisMode === 'left') {
        return axesMap.right ? Position.Left : Position.Right;
      }
      return axesMap.left ? Position.Right : Position.Left;
    }
  }

  if (iconPosition === 'left') {
    return Position.Left;
  }
  if (iconPosition === 'right') {
    return Position.Right;
  }
  if (iconPosition === 'below') {
    return Position.Bottom;
  }
  return Position.Top;
}
