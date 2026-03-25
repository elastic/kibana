/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYVisualizationState as XYVisualizationState } from '@kbn/lens-common';
import type { XYCurveType } from '@kbn/expression-xy-plugin/common';
import type { $Values } from 'utility-types';
import type { XYDecorations } from '../../../schema/charts/xy';
import type { XYApiLineInterpolation } from '../../../schema/charts/xy';
import { stripUndefined } from '../utils';

const curveTypeAPItoState: Record<$Values<XYApiLineInterpolation>, XYCurveType> = {
  linear: 'LINEAR',
  smooth: 'CURVE_MONOTONE_X',
  stepped: 'CURVE_STEP_AFTER',
};

const curveTypeStateToAPI: Record<XYCurveType, $Values<XYApiLineInterpolation>> = {
  LINEAR: 'linear',
  CURVE_MONOTONE_X: 'smooth',
  CURVE_STEP_AFTER: 'stepped',
};

type XYLensAppearanceState = Pick<
  XYVisualizationState,
  | 'valueLabels'
  | 'curveType'
  | 'fillOpacity'
  | 'minBarHeight'
  | 'hideEndzones'
  | 'showCurrentTimeMarker'
  | 'pointVisibility'
>;

const pointVisibilityAPItoState: Record<
  'auto' | 'visible' | 'hidden',
  'auto' | 'always' | 'never'
> = {
  auto: 'auto',
  visible: 'always',
  hidden: 'never',
};

const pointVisibilityStateToAPI: Record<
  'auto' | 'always' | 'never',
  'auto' | 'visible' | 'hidden'
> = {
  auto: 'auto',
  always: 'visible',
  never: 'hidden',
};

export function convertAppearanceToAPIFormat(config: XYLensAppearanceState): XYDecorations {
  return stripUndefined<XYDecorations>({
    values: config.valueLabels != null ? { visible: config.valueLabels === 'show' } : undefined,
    line_interpolation:
      config.curveType != null ? curveTypeStateToAPI[config.curveType] : undefined,
    fill_opacity: config.fillOpacity,
    minimum_bar_height: config.minBarHeight,
    end_zones: config.hideEndzones != null ? { visible: config.hideEndzones } : undefined,
    current_time_marker:
      config.showCurrentTimeMarker != null ? { visible: config.showCurrentTimeMarker } : undefined,
    point_visibility:
      config.pointVisibility != null
        ? pointVisibilityStateToAPI[config.pointVisibility]
        : undefined,
  });
}

export function convertAppearanceToStateFormat(config: XYDecorations): XYLensAppearanceState {
  return stripUndefined<XYLensAppearanceState>({
    valueLabels: config.values != null ? (config.values.visible ? 'show' : 'hide') : undefined,
    curveType:
      config.line_interpolation != null
        ? curveTypeAPItoState[config.line_interpolation]
        : undefined,
    fillOpacity: config.fill_opacity,
    minBarHeight: config.minimum_bar_height,
    hideEndzones: config.end_zones?.visible,
    showCurrentTimeMarker: config.current_time_marker?.visible,
    pointVisibility:
      config.point_visibility != null
        ? pointVisibilityAPItoState[config.point_visibility]
        : undefined,
  });
}
