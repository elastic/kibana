/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { XYState as XYLensState } from '@kbn/lens-common';
import type { AxisExtentConfig } from '@kbn/expression-xy-plugin/common';
import type { XYState } from '../../../schema';
import { convertLegendToStateFormat } from './legend';
import { buildXYLayer } from './layers';

function convertFittingToStateFormat(fitting: XYState['fitting']) {
  return {
    fittingFunction: fitting?.type,
    emphasizeFitting: fitting?.dotted,
    endValue: fitting?.endValue,
  };
}

type AxisType = Required<NonNullable<XYState['axis']>>;
type XAxisType = AxisType extends { x?: infer T } ? T : undefined;
type YAxisType = AxisType extends { left?: infer L; right?: infer R } ? L | R : undefined;
type ExtentsType = XAxisType['extent'] | YAxisType['extent'];

function convertAPIExtentToStateFormat(extent: ExtentsType): AxisExtentConfig | undefined {
  switch (extent?.type) {
    case 'full':
      return { mode: 'full', niceValues: extent.integer_rounding ?? true };
    case 'custom':
      return {
        mode: 'custom',
        lowerBound: extent.start,
        upperBound: extent.end,
        niceValues: extent.integer_rounding ?? true,
      };
    case 'focus':
      return { mode: 'dataBounds' };
    default:
      return;
  }
}

const orientationDictionary = {
  horizontal: 0,
  vertical: 90,
  angled: -45,
} as const;

function convertAxisSettingsToStateFormat(
  axis: XYState['axis']
): Pick<
  XYLensState,
  | 'xTitle'
  | 'yTitle'
  | 'yRightTitle'
  | 'yLeftScale'
  | 'yRightScale'
  | 'axisTitlesVisibilitySettings'
  | 'tickLabelsVisibilitySettings'
  | 'gridlinesVisibilitySettings'
  | 'xExtent'
  | 'yLeftExtent'
  | 'yRightExtent'
  | 'labelsOrientation'
> {
  return {
    xTitle: axis?.x?.title?.value,
    yTitle: axis?.left?.title?.value,
    yRightTitle: axis?.right?.title?.value,
    yLeftScale: axis?.left?.scale,
    yRightScale: axis?.right?.scale,
    axisTitlesVisibilitySettings: {
      x: axis?.x?.title?.visible ?? true,
      yLeft: axis?.left?.title?.visible ?? true,
      yRight: axis?.right?.title?.visible ?? true,
    },
    tickLabelsVisibilitySettings: {
      x: axis?.x?.ticks ?? true,
      yLeft: axis?.left?.ticks ?? true,
      yRight: axis?.right?.ticks ?? true,
    },
    gridlinesVisibilitySettings: {
      x: axis?.x?.grid ?? true,
      yLeft: axis?.left?.grid ?? true,
      yRight: axis?.right?.grid ?? true,
    },
    xExtent: convertAPIExtentToStateFormat(axis?.x?.extent),
    yLeftExtent: convertAPIExtentToStateFormat(axis?.left?.extent),
    yRightExtent: convertAPIExtentToStateFormat(axis?.right?.extent),
    labelsOrientation: {
      x: orientationDictionary[axis?.x?.label_orientation ?? 'horizontal'],
      yLeft: orientationDictionary[axis?.left?.label_orientation ?? 'horizontal'],
      yRight: orientationDictionary[axis?.right?.label_orientation ?? 'horizontal'],
    },
  };
}

const curveType = {
  linear: 'LINEAR',
  smooth: 'CURVE_MONOTONE_X',
  stepped: 'CURVE_STEP_AFTER',
} as const;

function convertAppearanceToStateFormat(
  config: XYState
): Pick<
  XYLensState,
  | 'valueLabels'
  | 'labelsOrientation'
  | 'curveType'
  | 'fillOpacity'
  | 'minBarHeight'
  | 'hideEndzones'
  | 'showCurrentTimeMarker'
  | 'pointVisibility'
> {
  return {
    valueLabels: config.decorations?.value_labels ? 'show' : 'hide',
    curveType: curveType[config.decorations?.line_interpolation ?? 'linear'],
    fillOpacity: config.decorations?.fill_opacity,
    minBarHeight: config.decorations?.minimum_bar_height,
  };
}

function buildLayers(layers: XYState['layers']): XYLensState['layers'] {
  return layers.map((layer, index) => [`${layer.type}_${index}`, buildXYLayer(layer, index)]);
}

export function buildVisualizationState(config: XYState): XYLensState {
  return {
    preferredSeriesType: 'bar_stacked',
    ...convertLegendToStateFormat(config.legend),
    ...convertFittingToStateFormat(config.fitting),
    ...convertAxisSettingsToStateFormat(config.axis),
    ...convertAppearanceToStateFormat(config),
    layers: buildLayers(config.layers),
  };
}
