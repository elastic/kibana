/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
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
  XYLensState,
  | 'valueLabels'
  | 'curveType'
  | 'fillOpacity'
  | 'minBarHeight'
  | 'hideEndzones'
  | 'showCurrentTimeMarker'
  | 'pointVisibility'
>;

export function convertAppearanceToAPIFormat(config: XYLensAppearanceState): XYDecorations {
  return stripUndefined<XYDecorations>({
    show_value_labels: config.valueLabels != null ? config.valueLabels === 'show' : undefined,
    line_interpolation:
      config.curveType != null ? curveTypeStateToAPI[config.curveType] : undefined,
    fill_opacity: config.fillOpacity,
    minimum_bar_height: config.minBarHeight,
    show_end_zones: config.hideEndzones,
    show_current_time_marker: config.showCurrentTimeMarker,
    point_visibility: config.pointVisibility,
  });
}

export function convertAppearanceToStateFormat(config: XYDecorations): XYLensAppearanceState {
  return stripUndefined<XYLensAppearanceState>({
    valueLabels:
      config.show_value_labels != null ? (config.show_value_labels ? 'show' : 'hide') : undefined,
    curveType:
      config.line_interpolation != null
        ? curveTypeAPItoState[config.line_interpolation]
        : undefined,
    fillOpacity: config.fill_opacity,
    minBarHeight: config.minimum_bar_height,
    hideEndzones: config.show_end_zones,
    showCurrentTimeMarker: config.show_current_time_marker,
    pointVisibility: config.point_visibility,
  });
}
