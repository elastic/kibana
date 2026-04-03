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
import type { XYStyling } from '../../../schema/charts/xy';
import type { XYApiLineInterpolation } from '../../../schema/charts/xy';
import { getReversibleMappings, stripUndefined } from '../utils';
import {
  DEFAULT_AREAS_FILL_OPACITY,
  DEFAULT_BARS_MINIMUM_HEIGHT,
  DEFAULT_CURRENT_TIME_MARKER_VISIBLE,
  DEFAULT_DATA_LABELS_VISIBLE,
  DEFAULT_LINES_INTERPOLATION,
  DEFAULT_PARTIAL_BUCKETS_VISIBLE,
  DEFAULT_POINTS_VISIBILITY,
} from './defaults';

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

export interface LayerPresence {
  hasBars: boolean;
  hasLines: boolean;
  hasAreas: boolean;
}

export function convertStylingToAPIFormat(
  config: XYLensAppearanceState,
  layerPresence: LayerPresence
): XYStyling {
  const hasLinesOrAreas = layerPresence.hasLines || layerPresence.hasAreas;
  return stripUndefined<XYStyling>({
    overlays: {
      partial_buckets: {
        visible: config.hideEndzones ?? DEFAULT_PARTIAL_BUCKETS_VISIBLE,
      },
      current_time_marker: {
        visible: config.showCurrentTimeMarker ?? DEFAULT_CURRENT_TIME_MARKER_VISIBLE,
      },
    },
    points: hasLinesOrAreas
      ? {
          visibility:
            pointVisibilityCompat.toAPI(config.pointVisibility) ?? DEFAULT_POINTS_VISIBILITY,
        }
      : undefined,
    lines: layerPresence.hasLines
      ? {
          interpolation: curveTypeCompat.toAPI(config.curveType) ?? DEFAULT_LINES_INTERPOLATION,
        }
      : undefined,
    bars: layerPresence.hasBars
      ? {
          minimum_height: config.minBarHeight ?? DEFAULT_BARS_MINIMUM_HEIGHT,
          data_labels: {
            visible:
              config.valueLabels != null
                ? config.valueLabels === 'show'
                : DEFAULT_DATA_LABELS_VISIBLE,
          },
        }
      : undefined,
    areas: layerPresence.hasAreas
      ? {
          fill_opacity: config.fillOpacity ?? DEFAULT_AREAS_FILL_OPACITY,
        }
      : undefined,
  });
}

export function convertStylingToStateFormat(config: XYStyling): XYLensAppearanceState {
  return stripUndefined<XYLensAppearanceState>({
    hideEndzones: config.overlays?.partial_buckets?.visible,
    showCurrentTimeMarker: config.overlays?.current_time_marker?.visible,
    valueLabels:
      config.bars?.data_labels != null
        ? config.bars.data_labels.visible
          ? 'show'
          : 'hide'
        : undefined,
    pointVisibility: pointVisibilityCompat.toState(config.points?.visibility),
    curveType: curveTypeCompat.toState(config.lines?.interpolation),
    minBarHeight: config.bars?.minimum_height,
    fillOpacity: config.areas?.fill_opacity,
  });
}
