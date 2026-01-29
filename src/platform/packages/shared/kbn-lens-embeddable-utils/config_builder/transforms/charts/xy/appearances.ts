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
import { XY_API_LINE_INTERPOLATION } from '../../../schema/charts/xy';
import { stripUndefined } from '../utils';

const curveTypeAPItoState: Record<$Values<typeof XY_API_LINE_INTERPOLATION>, XYCurveType> = {
  [XY_API_LINE_INTERPOLATION.LINEAR]: 'LINEAR',
  [XY_API_LINE_INTERPOLATION.SMOOTH]: 'CURVE_MONOTONE_X',
  [XY_API_LINE_INTERPOLATION.STEPPED]: 'CURVE_STEP_AFTER',
};

const curveTypeStateToAPI: Record<XYCurveType, $Values<typeof XY_API_LINE_INTERPOLATION>> = {
  LINEAR: XY_API_LINE_INTERPOLATION.LINEAR,
  CURVE_MONOTONE_X: XY_API_LINE_INTERPOLATION.SMOOTH,
  CURVE_STEP_AFTER: XY_API_LINE_INTERPOLATION.STEPPED,
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
    fill_opacity: config.fillOpacity != null ? config.fillOpacity : undefined,
    minimum_bar_height: config.minBarHeight != null ? config.minBarHeight : undefined,
    show_end_zones: config.hideEndzones != null ? !config.hideEndzones : undefined,
    show_current_time_marker:
      config.showCurrentTimeMarker != null ? config.showCurrentTimeMarker : undefined,
    point_visibility: config.pointVisibility != null ? config.pointVisibility : undefined,
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
    fillOpacity: config.fill_opacity != null ? config.fill_opacity : undefined,
    minBarHeight: config.minimum_bar_height != null ? config.minimum_bar_height : undefined,
    hideEndzones: config.show_end_zones != null ? !config.show_end_zones : undefined,
    showCurrentTimeMarker:
      config.show_current_time_marker != null ? config.show_current_time_marker : undefined,
    pointVisibility: config.point_visibility != null ? config.point_visibility : undefined,
  });
}
