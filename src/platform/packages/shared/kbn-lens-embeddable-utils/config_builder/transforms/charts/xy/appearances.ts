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
import { getReversibleMappings, stripUndefined } from '../utils';

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

const curveTypeCompat = getReversibleMappings<$Values<XYApiLineInterpolation>, XYCurveType>([
  ['linear', 'LINEAR'],
  ['smooth', 'CURVE_MONOTONE_X'],
  ['stepped', 'CURVE_STEP_AFTER'],
]);

const pointVisibilityCompat = getReversibleMappings([
  ['auto', 'auto'],
  ['visible', 'always'],
  ['hidden', 'never'],
]);

export function convertAppearanceToAPIFormat(config: XYLensAppearanceState): XYDecorations {
  return stripUndefined<XYDecorations>({
    values: config.valueLabels != null ? { visible: config.valueLabels === 'show' } : undefined,
    line_interpolation: curveTypeCompat.toAPI(config.curveType),
    fill_opacity: config.fillOpacity,
    minimum_bar_height: config.minBarHeight,
    end_zones: config.hideEndzones != null ? { visible: config.hideEndzones } : undefined,
    current_time_marker:
      config.showCurrentTimeMarker != null ? { visible: config.showCurrentTimeMarker } : undefined,
    point_visibility: pointVisibilityCompat.toAPI(config.pointVisibility),
  });
}

export function convertAppearanceToStateFormat(config: XYDecorations): XYLensAppearanceState {
  return stripUndefined<XYLensAppearanceState>({
    valueLabels: config.values != null ? (config.values.visible ? 'show' : 'hide') : undefined,
    curveType: curveTypeCompat.toState(config.line_interpolation),
    fillOpacity: config.fill_opacity,
    minBarHeight: config.minimum_bar_height,
    hideEndzones: config.end_zones?.visible,
    showCurrentTimeMarker: config.current_time_marker?.visible,
    pointVisibility: pointVisibilityCompat.toState(config.point_visibility),
  });
}
