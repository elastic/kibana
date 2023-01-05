/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Position } from '@elastic/charts';
import type { AxisExtentConfig } from '@kbn/visualizations-plugin/common/convert_to_lens';
import type { InterpolationMode, Scale, ThresholdLine } from '../types';

export interface Bounds {
  min?: string | number;
  max?: string | number;
}

export const getCurveType = (type?: InterpolationMode) => {
  switch (type) {
    case 'cardinal':
      return 'CURVE_MONOTONE_X';
    case 'step-after':
      return 'CURVE_STEP_AFTER';
    case 'linear':
    default:
      return 'LINEAR';
  }
};

export const getMode = (scale: Scale, bounds?: Bounds): AxisExtentConfig['mode'] => {
  if (scale.defaultYExtents) {
    return 'dataBounds';
  }

  if (scale.setYExtents || bounds) {
    return 'custom';
  }

  return 'full';
};

export const getYAxisPosition = (position: Position) => {
  if (position === Position.Top) {
    return Position.Right;
  }

  if (position === Position.Bottom) {
    return Position.Left;
  }

  return position;
};

export const getLineStyle = (style: ThresholdLine['style']) => {
  switch (style) {
    case 'full':
      return 'solid';
    case 'dashed':
    case 'dot-dashed':
      return style;
  }
};
