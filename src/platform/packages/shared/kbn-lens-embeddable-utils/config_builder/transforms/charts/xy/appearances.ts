/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
import { XYCurveTypes } from '@kbn/expression-xy-plugin/common';

import { XY_API_LINE_INTERPOLATION, type XYDecorations } from '../../../schema/charts/xy';

const curveTypeAPItoState = {
  [XY_API_LINE_INTERPOLATION.LINEAR]: XYCurveTypes.LINEAR,
  [XY_API_LINE_INTERPOLATION.SMOOTH]: XYCurveTypes.CURVE_MONOTONE_X,
  [XY_API_LINE_INTERPOLATION.STEPPED]: XYCurveTypes.CURVE_STEP_AFTER,
} as const;

const curveTypeStateToAPI = {
  [XYCurveTypes.LINEAR]: XY_API_LINE_INTERPOLATION.LINEAR,
  [XYCurveTypes.CURVE_MONOTONE_X]: XY_API_LINE_INTERPOLATION.SMOOTH,
  [XYCurveTypes.CURVE_STEP_AFTER]: XY_API_LINE_INTERPOLATION.STEPPED,
} as const;

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

// testing tool to write partial with type saftly
function partialBuilder<T extends object>() {
  return <K extends keyof T>(key: K, value: T[K]): Partial<T> => {
    return value != null ? ({ [key]: value } as Partial<T>) : {};
  };
}

export function convertAppearanceToAPIFormat(config: XYLensAppearanceState): XYDecorations {
  const b = partialBuilder<XYDecorations>();

  return {
    ...b(
      'show_value_labels',
      config.valueLabels != null ? config.valueLabels === 'show' : undefined
    ),
    ...b(
      'line_interpolation',
      config.curveType != null ? curveTypeStateToAPI[config.curveType] : undefined
    ),
    ...b('fill_opacity', config.fillOpacity != null ? config.fillOpacity : undefined),
    ...b('minimum_bar_height', config.minBarHeight != null ? config.minBarHeight : undefined),
    ...b('show_end_zones', config.hideEndzones != null ? !config.hideEndzones : undefined),
    ...b(
      'show_current_time_marker',
      config.showCurrentTimeMarker != null ? config.showCurrentTimeMarker : undefined
    ),
    ...b('point_visibility', config.pointVisibility != null ? config.pointVisibility : undefined),
  } satisfies XYDecorations;
}

export function convertAppearanceToStateFormat(config: XYDecorations): XYLensAppearanceState {
  const b = partialBuilder<XYLensAppearanceState>();

  return {
    ...b(
      'valueLabels',
      config.show_value_labels != null ? (config.show_value_labels ? 'show' : 'hide') : undefined
    ),
    ...b(
      'curveType',
      config.line_interpolation != null ? curveTypeAPItoState[config.line_interpolation] : undefined
    ),
    ...b('fillOpacity', config.fill_opacity != null ? config.fill_opacity : undefined),
    ...b('minBarHeight', config.minimum_bar_height != null ? config.minimum_bar_height : undefined),
    ...b('hideEndzones', config.show_end_zones != null ? !config.show_end_zones : undefined),
    ...b(
      'showCurrentTimeMarker',
      config.show_current_time_marker != null ? config.show_current_time_marker : undefined
    ),
    ...b('pointVisibility', config.point_visibility != null ? config.point_visibility : undefined),
  } satisfies XYLensAppearanceState;
}
